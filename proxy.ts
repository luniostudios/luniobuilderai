import { NextResponse, type NextRequest } from "next/server";

function siteSlugForHost(request: NextRequest): string | null {
  const configuredDomain = process.env.SITE_BASE_DOMAIN?.trim().toLowerCase();
  if (!configuredDomain) return null;

  const domain = configuredDomain.replace(/^https?:\/\//, "").split("/")[0].replace(/:\d+$/, "");
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
  if (!domain || !host.endsWith(`.${domain}`)) return null;

  const slug = host.slice(0, -(domain.length + 1));
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) ? slug : null;
}

export function proxy(request: NextRequest) {
  const slug = siteSlugForHost(request);
  if (!slug) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return NextResponse.next();
  if (pathname !== "/" && /\.[a-z0-9]{1,12}$/i.test(pathname)) return NextResponse.next();

  const destination = request.nextUrl.clone();
  destination.pathname = `/site-runtime/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(destination);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};