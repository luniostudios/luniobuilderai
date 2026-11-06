import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";
import { normalizeCmsData, toCmsJson } from "@/lib/cms";
import { normalizeSiteMetadata, toSiteMetadataJson } from "@/lib/site-metadata";
import { normalizeProjectSourceFiles } from "@/lib/project-files";
import { buildProjectPreview } from "@/lib/project-source";
import { PROJECT_CLIENT_COLUMNS } from "@/lib/project-fields";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .select(PROJECT_CLIENT_COLUMNS)
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not load project" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json({ project: data });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid project data" }, { status: 400 });
  }

  const updates: {
    name?: string;
    html?: string;
    source_files?: import("@/lib/database.types").Json;
    cms_data?: import("@/lib/database.types").Json;
    site_metadata?: import("@/lib/database.types").Json;
    updated_date: string;
  } = {
    updated_date: new Date().toISOString(),
  };
  if ("name" in body && typeof body.name === "string") updates.name = body.name.trim().slice(0, 120);
  if ("source_files" in body) {
    const sourceFiles = normalizeProjectSourceFiles(body.source_files);
    if (!sourceFiles) return NextResponse.json({ error: "Invalid React project files" }, { status: 400 });
    try {
      updates.source_files = sourceFiles as unknown as import("@/lib/database.types").Json;
      updates.html = await buildProjectPreview(sourceFiles);
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Could not compile project files.";
      return NextResponse.json({ error: `Could not compile React project: ${message}` }, { status: 400 });
    }
  } else if ("html" in body && typeof body.html === "string") {
    updates.html = body.html;
    updates.source_files = [];
  }
  if ("cms_data" in body) {
    const cmsData = normalizeCmsData(body.cms_data);
    if (!cmsData) return NextResponse.json({ error: "Invalid CMS data" }, { status: 400 });
    updates.cms_data = toCmsJson(cmsData);
  }
  if ("site_metadata" in body) {
    const siteMetadata = normalizeSiteMetadata(body.site_metadata);
    if (!siteMetadata) return NextResponse.json({ error: "Invalid site metadata" }, { status: 400 });
    updates.site_metadata = toSiteMetadataJson(siteMetadata);
  }
  if (updates.name === undefined && updates.html === undefined && updates.source_files === undefined && updates.cms_data === undefined && updates.site_metadata === undefined) {
    return NextResponse.json({ error: "No supported project fields provided" }, { status: 400 });
  }

  const { projectId } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .select(PROJECT_CLIENT_COLUMNS)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not update project" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json({ project: data });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Could not delete project" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}