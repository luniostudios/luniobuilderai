import { NextResponse } from "next/server";
import { getPublishedProject, getPublishedSiteOrigin } from "@/lib/site-services";
import { getSupabaseAdmin } from "@/lib/db";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  if (!getPublishedSiteOrigin(request, slug)) return NextResponse.json({ error: "Use this store from its dedicated domain." }, { status: 403 });
  const { data: project, error: projectError } = await getPublishedProject(slug);
  if (projectError) return NextResponse.json({ error: "Could not load this store." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "This store is not published." }, { status: 404 });
  const { data, error } = await getSupabaseAdmin().from("site_products")
    .select("id, sku, name, description, image_url, amount_cents, currency, requires_shipping")
    .eq("project_id", project.id).eq("active", true).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load store products." }, { status: 500 });
  return NextResponse.json({ products: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}