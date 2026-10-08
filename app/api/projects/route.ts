import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .select("*")
    .eq("owner_id", ownerId)
    .order("updated_date", { ascending: false });

  if (error) return NextResponse.json({ error: "Could not load projects" }, { status: 500 });
  return NextResponse.json({ projects: data });
}

export async function POST(request: Request) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const name =
    body && typeof body === "object" && "name" in body && typeof body.name === "string"
      ? body.name.trim().slice(0, 120)
      : "Untitled site";

  const { data, error } = await getSupabaseAdmin()
    .from("projects")
    .insert({ owner_id: ownerId, name: name || "Untitled site" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Could not create project" }, { status: 500 });
  return NextResponse.json({ project: data }, { status: 201 });
}