import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { allowPublicSubmission, createUnsubscribeToken, getPublishedProject, getPublishedSiteOrigin, readUnsubscribeToken } from "@/lib/site-services";
import { getSupabaseAdmin } from "@/lib/db";

type RouteContext = { params: Promise<{ slug: string }> };

async function unsubscribe(projectId: string, email: string) {
  const { error } = await getSupabaseAdmin()
    .from("site_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("email", email)
    .is("unsubscribed_at", null);
  return !error;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  if (!getPublishedSiteOrigin(request, slug)) return new Response("Forbidden", { status: 403 });
  const token = new URL(request.url).searchParams.get("unsubscribe") ?? "";
  const decoded = readUnsubscribeToken(token);
  if (!decoded) return new Response("This unsubscribe link is invalid or expired.", { status: 400 });
  const { data: project } = await getPublishedProject(slug);
  if (!project || decoded.projectId !== project.id) return new Response("This unsubscribe link is invalid or expired.", { status: 400 });
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title></head><body><main><h1>Unsubscribe from this newsletter?</h1><p>Confirm to stop receiving future updates.</p><form method="post" action="/api/sites/${encodeURIComponent(slug)}/newsletter?unsubscribe=${encodeURIComponent(token)}"><button type="submit">Confirm unsubscribe</button></form></main></body></html>`, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  if (!getPublishedSiteOrigin(request, slug)) return NextResponse.json({ error: "Use this form from the site's dedicated domain." }, { status: 403 });
  const { data: project, error: projectError } = await getPublishedProject(slug);
  if (projectError) return NextResponse.json({ error: "Could not load this site." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "This site is not published." }, { status: 404 });
  if (!process.env.SITE_SESSION_SECRET || process.env.SITE_SESSION_SECRET.length < 32) {
    return NextResponse.json({ error: "Newsletter signing is not configured on this site." }, { status: 503 });
  }

  const queryToken = new URL(request.url).searchParams.get("unsubscribe");
  const body: unknown = request.headers.get("content-type")?.includes("application/json")
    ? await request.json().catch(() => null)
    : null;
  if (queryToken) {
    const decoded = readUnsubscribeToken(queryToken);
    if (!decoded || decoded.projectId !== project.id) return NextResponse.json({ error: "Invalid unsubscribe link." }, { status: 400 });
    const ok = await unsubscribe(project.id, decoded.email);
    return NextResponse.json(ok ? { ok: true } : { error: "Could not update your subscription." }, { status: ok ? 200 : 500 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  if ("action" in body && body.action === "unsubscribe") {
    const token = "token" in body && typeof body.token === "string" ? body.token : "";
    const decoded = readUnsubscribeToken(token);
    if (!decoded || decoded.projectId !== project.id) return NextResponse.json({ error: "Invalid unsubscribe link." }, { status: 400 });
    const ok = await unsubscribe(project.id, decoded.email);
    return NextResponse.json(ok ? { ok: true } : { error: "Could not update your subscription." }, { status: ok ? 200 : 500 });
  }

  if (!await allowPublicSubmission(project.id, request)) return NextResponse.json({ error: "Too many signups. Please try again in a minute." }, { status: 429 });
  const emailValue = "email" in body && typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const consent = "consent" in body && body.consent === true;
  const honeypot = "website" in body && typeof body.website === "string" ? body.website : "";
  if (honeypot) return NextResponse.json({ ok: true, message: "Thanks for subscribing." });
  if (emailValue.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue) || !consent) {
    return NextResponse.json({ error: "Enter a valid email and confirm that you want to receive updates." }, { status: 400 });
  }

  const token = createUnsubscribeToken(project.id, emailValue);
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { error } = await getSupabaseAdmin().from("site_subscribers").upsert({
    project_id: project.id,
    email: emailValue,
    source: "website",
    consent_at: new Date().toISOString(),
    unsubscribe_token_hash: tokenHash,
    unsubscribed_at: null,
  }, { onConflict: "project_id,email" });
  if (error) return NextResponse.json({ error: "Could not save your subscription. Please try again." }, { status: 500 });
  return NextResponse.json({
    ok: true,
    message: "You're on the list.",
    unsubscribeUrl: `${getPublishedSiteOrigin(request, slug)}/api/sites/${encodeURIComponent(slug)}/newsletter?unsubscribe=${encodeURIComponent(token)}`,
  });
}