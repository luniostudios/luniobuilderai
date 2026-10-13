import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/db";
import {
  createPageTicket,
  getPublishedProject,
  getPublishedSiteOrigin,
  getSiteAuthClient,
  normalizePrivatePath,
  pageTicketCookieName,
  requestCookie,
  SITE_ACCESS_COOKIE,
  SITE_REFRESH_COOKIE,
  verifySitePassword,
} from "@/lib/site-services";

type RouteContext = { params: Promise<{ slug: string }> };
type AuthBody = { action?: unknown; email?: unknown; password?: unknown; path?: unknown; accessToken?: unknown; refreshToken?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

function message(error: { message?: string } | null): string {
  const value = error?.message ?? "Authentication could not be completed.";
  return value.length > 180 ? "Authentication could not be completed. Check your details and try again." : value;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  if (!getPublishedSiteOrigin(request, slug)) return NextResponse.json({ error: "Use this feature from the site's dedicated domain." }, { status: 403 });
  const { data: project, error } = await getPublishedProject(slug);
  if (error) return NextResponse.json({ error: "Could not load this site." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "This site is not published." }, { status: 404 });
  const client = getSiteAuthClient();
  if (!client) return NextResponse.json({ authenticated: false, error: "Visitor accounts are not configured." }, { status: 503 });

  const accessToken = requestCookie(request, SITE_ACCESS_COOKIE);
  const refreshToken = requestCookie(request, SITE_REFRESH_COOKIE);
  let user = accessToken ? (await client.auth.getUser(accessToken)).data.user : null;
  let renewed: { accessToken: string; refreshToken: string } | null = null;
  if (!user && refreshToken) {
    const result = await client.auth.refreshSession({ refresh_token: refreshToken });
    if (!result.error && result.data.session) {
      user = result.data.session.user;
      renewed = { accessToken: result.data.session.access_token, refreshToken: result.data.session.refresh_token };
    }
  }
  if (!user) return NextResponse.json({ authenticated: false });

  const { data: membership, error: membershipError } = await getSupabaseAdmin().from("site_memberships")
    .select("auth_user_id").eq("project_id", project.id).eq("auth_user_id", user.id).maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Could not check site membership." }, { status: 500 });
  if (!membership) return NextResponse.json({ authenticated: false });
  const response = NextResponse.json({ authenticated: true, email: user.email ?? null }, { headers: { "Cache-Control": "no-store" } });
  if (renewed) setAuthCookies(response, request, renewed.accessToken, renewed.refreshToken, 3600);
  return response;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const origin = getPublishedSiteOrigin(request, slug);
  if (!origin) return NextResponse.json({ error: "Use this feature from the site's dedicated domain." }, { status: 403 });

  const { data: project, error: projectError } = await getPublishedProject(slug);
  if (projectError) return NextResponse.json({ error: "Could not load this site." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "This site is not published." }, { status: 404 });

  const body: unknown = await request.json().catch(() => null);
  if (!isRecord(body)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const authBody = body as AuthBody;
  const action = authBody.action;
  const authClient = getSiteAuthClient();
  if (!authClient) return NextResponse.json({ error: "Visitor accounts are not configured. Contact the site owner." }, { status: 503 });

  if (action === "logout") {
    const cookieStore = await cookies();
    cookieStore.delete(SITE_ACCESS_COOKIE);
    cookieStore.delete(SITE_REFRESH_COOKIE);
    return NextResponse.json({ ok: true });
  }

  if (action === "page-password") {
    if (typeof authBody.path !== "string" || typeof authBody.password !== "string") {
      return NextResponse.json({ error: "Enter the page password." }, { status: 400 });
    }
    const path = normalizePrivatePath(authBody.path);
    if (!path) return NextResponse.json({ error: "Invalid page." }, { status: 400 });
    const { data: page } = await getSupabaseAdmin()
      .from("site_private_pages")
      .select("password_salt, password_hash, access_mode")
      .eq("project_id", project.id)
      .eq("path", path)
      .maybeSingle();
    if (!page || page.access_mode !== "password" || !page.password_salt || !page.password_hash || !verifySitePassword(authBody.password, page.password_salt, page.password_hash)) {
      return NextResponse.json({ error: "That password is not correct." }, { status: 401 });
    }
    let ticket: string;
    try {
      ticket = createPageTicket(project.id, path);
    } catch {
      return NextResponse.json({ error: "Protected pages are not configured on this site." }, { status: 503 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(pageTicketCookieName(project.id, path), ticket, {
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60,
    });
    return response;
  }

  if (action === "session") {
    if (typeof authBody.accessToken !== "string" || typeof authBody.refreshToken !== "string" || authBody.accessToken.length > 8192 || authBody.refreshToken.length > 8192) {
      return NextResponse.json({ error: "The sign-in link is invalid or expired." }, { status: 400 });
    }
    const { data, error } = await authClient.auth.setSession({ access_token: authBody.accessToken, refresh_token: authBody.refreshToken });
    if (error || !data.session) {
      return NextResponse.json({ error: "The sign-in link is invalid or expired." }, { status: 401 });
    }
    const { error: membershipError } = await getSupabaseAdmin().from("site_memberships").upsert({
      project_id: project.id,
      auth_user_id: data.session.user.id,
      email: data.session.user.email ?? "",
    });
    if (membershipError) return NextResponse.json({ error: "Could not create your site account." }, { status: 500 });
    const response = NextResponse.json({ ok: true });
    setAuthCookies(response, request, data.session.access_token, data.session.refresh_token, data.session.expires_in ?? 3600);
    return response;
  }

  if (action === "signup" || action === "login") {
    if (typeof authBody.email !== "string" || typeof authBody.password !== "string") {
      return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    }
    const email = authBody.email.trim().toLowerCase();
    const password = authBody.password;
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || password.length > 128) {
      return NextResponse.json({ error: "Enter a valid email and a password between 10 and 128 characters." }, { status: 400 });
    }

    const result = action === "signup"
      ? await authClient.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback` } })
      : await authClient.auth.signInWithPassword({ email, password });
    if (result.error) return NextResponse.json({ error: message(result.error) }, { status: 400 });

    if (result.data.user) {
      const { error: membershipError } = await getSupabaseAdmin().from("site_memberships").upsert({
        project_id: project.id,
        auth_user_id: result.data.user.id,
        email: result.data.user.email ?? email,
      });
      if (membershipError) return NextResponse.json({ error: "Could not create your site account." }, { status: 500 });
    }

    const session = result.data.session;
    const response = NextResponse.json({
      ok: true,
      needsEmailConfirmation: action === "signup" && !session,
      message: action === "signup" && !session ? "Check your email to confirm your account, then return here to sign in." : "Signed in.",
    });
    if (session) setAuthCookies(response, request, session.access_token, session.refresh_token, session.expires_in ?? 3600);
    return response;
  }

  if (action === "forgot") {
    if (typeof authBody.email !== "string" || authBody.email.length > 254) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    const { error } = await authClient.auth.resetPasswordForEmail(authBody.email.trim().toLowerCase(), {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset")}`,
    });
    if (error) return NextResponse.json({ error: message(error) }, { status: 400 });
    return NextResponse.json({ ok: true, message: "If an account exists for that email, a password reset link is on its way." });
  }

  if (action === "reset") {
    if (typeof authBody.password !== "string" || authBody.password.length < 10 || authBody.password.length > 128) {
      return NextResponse.json({ error: "Choose a password between 10 and 128 characters." }, { status: 400 });
    }
    const accessToken = requestCookie(request, SITE_ACCESS_COOKIE);
    const refreshToken = requestCookie(request, SITE_REFRESH_COOKIE);
    if (!accessToken || !refreshToken) return NextResponse.json({ error: "Request a new password reset link." }, { status: 401 });
    const { error: sessionError } = await authClient.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (sessionError) return NextResponse.json({ error: "The reset session expired. Request a new link." }, { status: 401 });
    const { error } = await authClient.auth.updateUser({ password: authBody.password });
    if (error) return NextResponse.json({ error: message(error) }, { status: 400 });
    return NextResponse.json({ ok: true, message: "Your password has been updated." });
  }

  return NextResponse.json({ error: "Unsupported authentication action." }, { status: 400 });
}

function setAuthCookies(response: NextResponse, request: Request, accessToken: string, refreshToken: string, expiresIn: number) {
  const secure = new URL(request.url).protocol === "https:";
  response.cookies.set(SITE_ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, Math.min(expiresIn, 60 * 60)),
  });
  response.cookies.set(SITE_REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}