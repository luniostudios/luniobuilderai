import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

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

  const publishedSlug = project.published_slug || `${slugBase(project.name)}-${randomUUID().slice(0, 8)}`;
  const { data, error } = await supabase
    .from("projects")
    .update({ published_slug: publishedSlug, published_at: new Date().toISOString(), updated_date: new Date().toISOString() })
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .select("*")
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