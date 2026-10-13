import { injectCmsContent } from "@/lib/cms";
import { injectSiteMetadata } from "@/lib/site-metadata";
import { getSupabaseAdmin } from "@/lib/db";
import {
  getPublishedProject,
  getPublishedSiteOrigin,
  getSiteVisitor,
  normalizePrivatePath,
  pageTicketCookieName,
  requestCookie,
  SITE_ACCESS_COOKIE,
  SITE_REFRESH_COOKIE,
  verifyPageTicket,
} from "@/lib/site-services";

type RouteContext = { params: Promise<{ slug: string; path?: string[] }> };

function htmlResponse(html: string, status = 200, headers?: HeadersInit) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      ...headers,
    },
  });
}

function withVisitorSession(response: Response, request: Request, session?: { accessToken: string; refreshToken: string; expiresIn: number }) {
  if (!session) return response;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", `${SITE_ACCESS_COOKIE}=${encodeURIComponent(session.accessToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.max(60, Math.min(session.expiresIn, 3600))}${secure}`);
  headers.append("Set-Cookie", `${SITE_REFRESH_COOKIE}=${encodeURIComponent(session.refreshToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`);
  return new Response(response.body, { status: response.status, headers });
}

function authPage(slug: string, mode: "login" | "signup" | "forgot" | "reset" | "callback"): string {
  const safeSlug = JSON.stringify(slug);
  if (mode === "callback") {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Completing sign in</title></head><body><main><p id="status">Completing sign in...</p></main><script>(()=>{const slug=${safeSlug};const p=new URLSearchParams(location.hash.slice(1));const accessToken=p.get('access_token');const refreshToken=p.get('refresh_token');history.replaceState(null,'',location.pathname+location.search);const requestedNext=new URLSearchParams(location.search).get('next')||'/';const next=requestedNext.startsWith('/')&&!requestedNext.startsWith('//')?requestedNext:'/';if(!accessToken||!refreshToken){document.getElementById('status').textContent='This sign-in link is invalid or expired. Return to the site and try again.';return}fetch('/api/sites/'+encodeURIComponent(slug)+'/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'session',accessToken,refreshToken})}).then(r=>r.json()).then(data=>{if(!data.ok)throw Error();location.replace(next)}).catch(()=>{document.getElementById('status').textContent='Could not complete sign in. Please request a new link.'})})()</script></body></html>`;
  }

    const title = mode === "signup" ? "Create your account" : mode === "forgot" || mode === "reset" ? "Reset your password" : "Sign in";
    const action = mode === "signup" ? "signup" : mode === "forgot" ? "forgot" : mode === "reset" ? "reset" : "login";
    const emailField = mode === "reset" ? "" : '<label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required>';
    const passwordField = mode === "signup" || mode === "login"
      ? `<label for="password">Password</label><input id="password" name="password" type="password" autocomplete="${mode === "signup" ? "new-password" : "current-password"}" required minlength="10">`
      : mode === "reset" ? '<label for="password">New password</label><input id="password" name="password" type="password" autocomplete="new-password" required minlength="10">' : "";
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f6f4;color:#17211a;font:16px system-ui,sans-serif}main{width:min(100% - 32px,400px);padding:32px;background:white;border:1px solid #dce3dd;border-radius:8px}h1{margin:0 0 24px;font-size:25px}label{display:block;margin:16px 0 6px;font-size:14px}input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #aebbb0;border-radius:5px;font:inherit}button{width:100%;margin-top:20px;padding:12px;border:0;border-radius:5px;background:#1e5737;color:white;font:inherit;font-weight:600;cursor:pointer}a{color:#1e5737}#status{min-height:24px;color:#9d2b24}</style></head><body><main><h1>${title}</h1><form id="auth-form">${emailField}${passwordField}<button type="submit">${title}</button></form><p id="status" role="status"></p><nav><a href="/auth/login">Sign in</a> · <a href="/auth/signup">Create account</a> · <a href="/auth/forgot">Forgot password?</a></nav></main><script>(()=>{const slug=${safeSlug};const mode=${JSON.stringify(mode)};const form=document.getElementById('auth-form');form.addEventListener('submit',async event=>{event.preventDefault();const data=Object.fromEntries(new FormData(form));const response=await fetch('/api/sites/'+encodeURIComponent(slug)+'/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:${JSON.stringify(action)},...data})});const result=await response.json();const status=document.getElementById('status');status.textContent=result.message||result.error||'Request complete.';if(result.ok&&(mode==='login'||mode==='reset'||(mode==='signup'&&!result.needsEmailConfirmation)))location.assign('/')})})()</script></main></body></html>`;
}

function protectedPageGate(slug: string, path: string, mode: "members" | "password"): string {
  const action = mode === "members" ? "Sign in to access this page" : "Enter the page password";
  const field = mode === "members"
    ? '<label>Email <input name="email" type="email" autocomplete="email" required></label><label>Password <input name="password" type="password" autocomplete="current-password" required></label>'
    : '<label>Password <input name="password" type="password" autocomplete="current-password" required></label>';
  const endpointAction = mode === "members" ? "login" : "page-password";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Protected page</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f6f4;color:#17211a;font:16px system-ui,sans-serif}main{width:min(100% - 32px,400px);padding:32px;background:white;border:1px solid #dce3dd;border-radius:8px}h1{font-size:24px}label{display:block;margin:18px 0 6px}input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #aebbb0;border-radius:5px;font:inherit}button{width:100%;margin-top:20px;padding:12px;border:0;border-radius:5px;background:#1e5737;color:white;font:inherit;font-weight:600}#status{min-height:24px;color:#9d2b24}</style></head><body><main><h1>${action}</h1><form id="gate">${field}<button>Continue</button></form><p id="status" role="status"></p>${mode === "members" ? '<a href="/auth/signup">Create an account</a>' : ""}</main><script>(()=>{const form=document.getElementById('gate');form.addEventListener('submit',async event=>{event.preventDefault();const response=await fetch('/api/sites/'+encodeURIComponent(${JSON.stringify(slug)})+'/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:${JSON.stringify(endpointAction)},path:${JSON.stringify(path)},...Object.fromEntries(new FormData(form))})});const data=await response.json();if(data.ok)location.reload();else document.getElementById('status').textContent=data.error||'Could not verify access.'})})()</script></body></html>`;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { slug, path: pathSegments = [] } = await params;
  const siteOrigin = getPublishedSiteOrigin(request, slug);
  if (!siteOrigin) return htmlResponse("<!doctype html><title>Site not configured</title><p>This published site needs its dedicated site domain configured.</p>", 503);

  const { data: project, error } = await getPublishedProject(slug);
  if (error) return htmlResponse("<!doctype html><title>Unavailable</title><p>Could not load this site.</p>", 500);
  if (!project?.html) return htmlResponse("<!doctype html><title>Not found</title><p>This site is not published.</p>", 404);

  const path = pathSegments.join("/");
  if (path === "auth/login" || path === "auth/signup" || path === "auth/forgot" || path === "auth/reset" || path === "auth/callback") {
    return htmlResponse(authPage(slug, path.slice("auth/".length) as "login" | "signup" | "forgot" | "reset" | "callback"));
  }
  if (path === "checkout/success") {
    return htmlResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Order status</title></head><body><main><h1 id="title">Checking your order...</h1><p id="message">Please wait while the payment provider confirms your checkout.</p></main><script>(()=>{const sessionId=new URLSearchParams(location.search).get('session_id')||'';const url='/api/sites/'+encodeURIComponent(${JSON.stringify(slug)})+'/checkout/status?session_id='+encodeURIComponent(sessionId);fetch(url).then(r=>r.json()).then(data=>{if(data.status==='paid'){document.getElementById('title').textContent='Payment confirmed';document.getElementById('message').textContent='Your payment is confirmed. Contact the store if you need an order receipt.'}else{document.getElementById('title').textContent='Payment pending';document.getElementById('message').textContent='Your order is not confirmed yet. Check your email or contact the store.'}}).catch(()=>{document.getElementById('title').textContent='Order status unavailable';document.getElementById('message').textContent='The store could not verify this checkout. Contact the store before placing the order again.'})})()</script></body></html>`);
  }
  if (path === "checkout/cancelled") return htmlResponse("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Checkout cancelled</title></head><body><main><h1>Checkout cancelled</h1><p>Your cart has not been charged. Return to the store to try again.</p><a href=\"/\">Return to store</a></main></body></html>");

  const privatePath = normalizePrivatePath(path);
  if (privatePath) {
    const { data: protectedPage, error: pageError } = await getSupabaseAdmin()
      .from("site_private_pages")
      .select("path, title, html, access_mode")
      .eq("project_id", project.id)
      .eq("path", privatePath)
      .maybeSingle();
    if (pageError) return htmlResponse("<!doctype html><title>Unavailable</title><p>Could not load this page.</p>", 500);
    if (protectedPage) {
        let ticketName: string;
        try {
          ticketName = pageTicketCookieName(project.id, privatePath);
        } catch {
          return htmlResponse("<!doctype html><title>Protected pages unavailable</title><p>Protected pages need a session secret configured by the site owner.</p>", 503);
        }
      const passwordAuthorized = verifyPageTicket(requestCookie(request, ticketName), project.id, privatePath);
      const visitor = protectedPage.access_mode === "members" ? await getSiteVisitor(request, project.id) : null;
      if (!passwordAuthorized && !visitor) return htmlResponse(protectedPageGate(slug, privatePath, protectedPage.access_mode as "members" | "password"), 401);
      return withVisitorSession(
        htmlResponse(protectedPage.html, 200, { "Content-Security-Policy": "frame-ancestors 'none'" }),
        request,
        visitor?.refreshedSession,
      );
    }
  }

  const html = injectSiteMetadata(injectCmsContent(project.html, project.cms_data), project.site_metadata, project.name);
  return htmlResponse(html, 200, { "Content-Security-Policy": "frame-ancestors 'none'" });
}