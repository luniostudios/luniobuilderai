import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";
import { hashSitePassword, normalizePrivatePath } from "@/lib/site-services";

type RouteContext = { params: Promise<{ projectId: string }> };

async function ownedProject(projectId: string, ownerId: string) {
  return getSupabaseAdmin().from("projects").select("id").eq("id", projectId).eq("owner_id", ownerId).maybeSingle();
}

export async function GET(_request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await params;
  const { data: project, error: ownerError } = await ownedProject(projectId, ownerId);
  if (ownerError) return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { data, error } = await getSupabaseAdmin().from("site_private_pages")
    .select("path, title, access_mode, password_hash, updated_at").eq("project_id", projectId).order("path");
  if (error) return NextResponse.json({ error: "Could not load protected pages." }, { status: 500 });
  return NextResponse.json({ pages: (data ?? []).map((page) => ({ ...page, passwordConfigured: Boolean(page.password_hash), password_hash: undefined })) });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await params;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("path" in body) || typeof body.path !== "string" || !("password" in body) || typeof body.password !== "string") {
    return NextResponse.json({ error: "Enter a protected page path and password." }, { status: 400 });
  }
  const path = normalizePrivatePath(body.path);
  if (!path || body.password.length < 10 || body.password.length > 128) {
    return NextResponse.json({ error: "Use a valid page path and a password between 10 and 128 characters." }, { status: 400 });
  }
  const { data: project, error: ownerError } = await ownedProject(projectId, ownerId);
  if (ownerError) return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { data: page, error: pageError } = await getSupabaseAdmin().from("site_private_pages")
    .select("path, access_mode").eq("project_id", projectId).eq("path", path).maybeSingle();
  if (pageError) return NextResponse.json({ error: "Could not load protected page." }, { status: 500 });
  if (!page || page.access_mode !== "password") return NextResponse.json({ error: "That password-protected page was not found." }, { status: 404 });

  const { salt, hash } = hashSitePassword(body.password);
  const { error } = await getSupabaseAdmin().from("site_private_pages")
    .update({ password_salt: salt, password_hash: hash, updated_at: new Date().toISOString() })
    .eq("project_id", projectId).eq("path", path);
  if (error) return NextResponse.json({ error: "Could not save page password." }, { status: 500 });
  return NextResponse.json({ ok: true });
}