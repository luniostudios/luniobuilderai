import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/db";

export const SITE_ACCESS_COOKIE = "lunio_site_access";
export const SITE_REFRESH_COOKIE = "lunio_site_refresh";

export function getSiteAuthClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function getPublishedSiteOrigin(request: Request, slug: string): string | null {
  const domainSetting = process.env.SITE_BASE_DOMAIN?.trim().toLowerCase();
  if (!domainSetting) return null;
  const domain = domainSetting.replace(/^https?:\/\//, "").split("/")[0].replace(/:\d+$/, "");
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "")
    .split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
  const expectedHost = `${slug}.${domain}`;
  if (host !== expectedHost) return null;

  const origin = new URL(request.url).origin;
  if (request.headers.get("origin") && request.headers.get("origin") !== origin) return null;
  return origin;
}

export async function getPublishedProject(slug: string) {
  return getSupabaseAdmin()
    .from("projects")
    .select("id, owner_id, name, html, cms_data, site_metadata, published_slug, stripe_connect_account_id")
    .eq("published_slug", slug)
    .maybeSingle();
}

export function requestCookie(request: Request, name: string): string | null {
  const cookies = request.headers.get("cookie")?.split(";") ?? [];
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export async function getSiteVisitor(request: Request, projectId: string) {
  let token = requestCookie(request, SITE_ACCESS_COOKIE);
  const client = getSiteAuthClient();
  if (!token || !client) return null;

  let { data, error } = await client.auth.getUser(token);
  let refreshedSession: { accessToken: string; refreshToken: string; expiresIn: number } | undefined;
  if (error || !data.user) {
    const refreshToken = requestCookie(request, SITE_REFRESH_COOKIE);
    if (!refreshToken) return null;
    const refreshed = await client.auth.refreshSession({ refresh_token: refreshToken });
    if (refreshed.error || !refreshed.data.session) return null;
    token = refreshed.data.session.access_token;
    refreshedSession = {
      accessToken: refreshed.data.session.access_token,
      refreshToken: refreshed.data.session.refresh_token,
      expiresIn: refreshed.data.session.expires_in ?? 3600,
    };
    ({ data, error } = await client.auth.getUser(token));
    if (error || !data.user) return null;
  }

  const { data: membership } = await getSupabaseAdmin()
    .from("site_memberships")
    .select("auth_user_id")
    .eq("project_id", projectId)
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  return membership ? { user: data.user, refreshedSession } : null;
}

export function normalizePrivatePath(value: string): string | null {
  const path = `/${value.replace(/^\/+|\/+$/g, "")}`.toLowerCase();
  const segments = path.slice(1).split("/");
  if (path === "/" || path.length > 180 || segments.some((part) => !/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(part))) return null;
  if (segments[0] === "auth" || segments[0] === "api") return null;
  return path;
}

export function hashSitePassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifySitePassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const actual = scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

type PageTicket = { projectId: string; path: string; expiresAt: number };

function siteSessionSecret(): string {
  const secret = process.env.SITE_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SITE_SESSION_SECRET must contain at least 32 characters");
  return secret;
}

export function createPageTicket(projectId: string, path: string): string {
  const payload = Buffer.from(JSON.stringify({ projectId, path, expiresAt: Date.now() + 12 * 60 * 60 * 1000 } satisfies PageTicket)).toString("base64url");
  const signature = createHmac("sha256", siteSessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyPageTicket(ticket: string | null, projectId: string, path: string): boolean {
  if (!ticket) return false;
  const [payload, signature, extra] = ticket.split(".");
  if (!payload || !signature || extra) return false;
  try {
    const expected = createHmac("sha256", siteSessionSecret()).update(payload).digest();
    const received = Buffer.from(signature, "base64url");
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PageTicket;
    return data.projectId === projectId && data.path === path && data.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function pageTicketCookieName(projectId: string, path: string): string {
  const digest = createHmac("sha256", siteSessionSecret()).update(`${projectId}:${path}`).digest("hex").slice(0, 24);
  return `lunio_page_${digest}`;
}

export function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function createUnsubscribeToken(projectId: string, email: string): string {
  const payload = Buffer.from(JSON.stringify({ projectId, email })).toString("base64url");
  const signature = createHmac("sha256", siteSessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readUnsubscribeToken(token: string): { projectId: string; email: string } | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  try {
    const expected = createHmac("sha256", siteSessionSecret()).update(payload).digest();
    const received = Buffer.from(signature, "base64url");
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    const value: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!value || typeof value !== "object" || !("projectId" in value) || typeof value.projectId !== "string" || !("email" in value) || typeof value.email !== "string") return null;
    return { projectId: value.projectId, email: value.email };
  } catch {
    return null;
  }
}

export async function allowPublicSubmission(projectId: string, request: Request): Promise<boolean> {
  const secret = process.env.SITE_SESSION_SECRET;
  if (!secret || secret.length < 32) return false;
  const ip = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? "unknown";
  const ipHash = createHmac("sha256", secret).update(ip.slice(0, 128)).digest("hex");
  const minute = Math.floor(Date.now() / 60_000) * 60_000;
  const windowStarted = new Date(minute).toISOString();
  const { data, error } = await getSupabaseAdmin().rpc("reserve_site_form_submission", {
    p_project_id: projectId,
    p_ip_hash: ipHash,
    p_window_started: windowStarted,
    p_limit: 5,
  });
  return !error && data === true;
}