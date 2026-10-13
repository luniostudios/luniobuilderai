import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";
import { createUnsubscribeToken } from "@/lib/site-services";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await params;
  const supabase = getSupabaseAdmin();
  const { data: project, error: projectError } = await supabase.from("projects")
    .select("id, published_slug")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (projectError) return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const { data: subscribers, error } = await supabase.from("site_subscribers")
    .select("id, email, source, consent_at, unsubscribed_at, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return NextResponse.json({ error: "Could not load subscribers." }, { status: 500 });
  const origin = process.env.SITE_BASE_DOMAIN ? `https://${project.published_slug}.${process.env.SITE_BASE_DOMAIN.replace(/^https?:\/\//, "").split("/")[0]}` : null;
  return NextResponse.json({
    subscribers: (subscribers ?? []).map((subscriber) => ({
      ...subscriber,
      unsubscribeUrl: origin && project.published_slug
        ? `${origin}/api/sites/${encodeURIComponent(project.published_slug)}/newsletter?unsubscribe=${encodeURIComponent(createUnsubscribeToken(projectId, subscriber.email))}`
        : null,
    })),
  });
}