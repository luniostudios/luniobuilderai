import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";
import { PROJECT_CLIENT_COLUMNS } from "@/lib/project-fields";

type RouteContext = { params: Promise<{ projectId: string }> };

function slugBase(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    .replace(/-$/g, "") || "website";
}

async function availableSlug(base: string, projectId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const firstSuffix = base === "www" ? 2 : 1;

  for (let suffix = firstSuffix; suffix < firstSuffix + 1000; suffix += 1) {
    const candidate = suffix === 1
      ? base
      : `${base.slice(0, 48 - String(suffix).length - 1)}-${suffix}`;
    const { data, error } = await supabase
      .from("projects")
      .select("id")
      .eq("published_slug", candidate)
      .neq("id", projectId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;
  }

  return null;
}

export async function POST(_request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const supabase = getSupabaseAdmin();
  const { data: project, error: loadError } = await supabase
    .from("projects")
    .select("id, name, html, published_slug")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (loadError) return NextResponse.json({ error: "Could not load project" }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!project.html.trim()) return NextResponse.json({ error: "Add website content before publishing" }, { status: 400 });

  let publishedSlug = project.published_slug;
  if (!publishedSlug) {
    try {
      publishedSlug = await availableSlug(slugBase(project.name), projectId);
    } catch {
      return NextResponse.json({ error: "Could not reserve a site address" }, { status: 500 });
    }
    if (!publishedSlug) return NextResponse.json({ error: "Could not reserve a site address" }, { status: 409 });
  }
  const { data, error } = await supabase
    .from("projects")
    .update({ published_slug: publishedSlug, published_at: new Date().toISOString(), updated_date: new Date().toISOString() })
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .select(PROJECT_CLIENT_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: "Could not publish website" }, { status: 500 });
  return NextResponse.json({ project: data });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .update({ published_slug: null, published_at: null, updated_date: new Date().toISOString() })
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not unpublish website" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}