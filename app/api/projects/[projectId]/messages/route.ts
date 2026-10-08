import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";

type RouteContext = { params: Promise<{ projectId: string }> };

async function userOwnsProject(projectId: string, ownerId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  return !error && Boolean(data);
}

export async function GET(_request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  if (!(await userOwnsProject(projectId, ownerId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("messages")
    .select("*")
    .eq("project_id", projectId)
    .eq("owner_id", ownerId)
    .order("created_date", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: "Could not load messages" }, { status: 500 });
  return NextResponse.json({ messages: (data ?? []).reverse() });
}

export async function POST(request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  if (!(await userOwnsProject(projectId, ownerId))) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (
    !body ||
    typeof body !== "object" ||
    !("role" in body) ||
    (body.role !== "user" && body.role !== "assistant") ||
    !("content" in body) ||
    typeof body.content !== "string" ||
    !body.content.trim() ||
    body.content.length > 50000
  ) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("messages")
    .insert({
      project_id: projectId,
      owner_id: ownerId,
      role: body.role,
      content: body.content.trim(),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Could not save message" }, { status: 500 });
  return NextResponse.json({ message: data }, { status: 201 });
}