import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";

type RouteContext = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await params;
  const supabase = getSupabaseAdmin();
  const { data: project, error: projectError } = await supabase.from("projects")
    .select("id").eq("id", projectId).eq("owner_id", ownerId).maybeSingle();
  if (projectError) return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { data, error } = await supabase.from("site_orders").select("id, customer_email, status, amount_total, currency, items, shipping_address, created_at")
    .eq("project_id", projectId).order("created_at", { ascending: false }).limit(1000);
  if (error) return NextResponse.json({ error: "Could not load orders." }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}