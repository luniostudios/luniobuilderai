import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/") || pathname === "/api" || pathname.startsWith("/_next/")) {
    return NextResponse.next();
  }

  const domainSetting = process.env.NEXT_PUBLIC_SITE_BASE_DOMAIN?.trim()
    || process.env.SITE_BASE_DOMAIN?.trim()
    || "luniobuilder.com";
  const domain = domainSetting.toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/:\d+$/, "");
  const host = (request.headers.get("host") ?? request.nextUrl.host).split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
  const suffix = `.${domain}`;
  if (!host.endsWith(suffix)) return NextResponse.next();

  const slug = host.slice(0, -suffix.length);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug === "www") return NextResponse.next();

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = `/site-runtime/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(rewriteUrl);
}