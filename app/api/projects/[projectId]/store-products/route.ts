import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";

type RouteContext = { params: Promise<{ projectId: string }> };
type ProductInput = {
  sku?: unknown;
  name?: unknown;
  description?: unknown;
  image_url?: unknown;
  amount_cents?: unknown;
  currency?: unknown;
  requires_shipping?: unknown;
  active?: unknown;
};

function parseProduct(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as ProductInput;
  const sku = typeof input.sku === "string" ? input.sku.trim() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const imageUrl = typeof input.image_url === "string" ? input.image_url.trim() : "";
  const amountCents = input.amount_cents;
  const currency = typeof input.currency === "string" ? input.currency.toLowerCase() : "usd";
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(sku) || !name || name.length > 160 || description.length > 2000) return null;
  if (!Number.isSafeInteger(amountCents) || (amountCents as number) < 1 || (amountCents as number) > 100_000_000) return null;
  if (!/^[a-z]{3}$/.test(currency)) return null;
  if (imageUrl && (!/^https:\/\//i.test(imageUrl) || imageUrl.length > 2048)) return null;
  if (input.requires_shipping !== undefined && typeof input.requires_shipping !== "boolean") return null;
  if (input.active !== undefined && typeof input.active !== "boolean") return null;
  return {
    sku,
    name,
    description,
    image_url: imageUrl,
    amount_cents: amountCents as number,
    currency,
    requires_shipping: input.requires_shipping === true,
    active: input.active !== false,
    updated_at: new Date().toISOString(),
  };
}

async function authorize(projectId: string, ownerId: string) {
  return getSupabaseAdmin().from("projects").select("id").eq("id", projectId).eq("owner_id", ownerId).maybeSingle();
}

export async function GET(_request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await params;
  const { data: project, error: ownerError } = await authorize(projectId, ownerId);
  if (ownerError) return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { data, error } = await getSupabaseAdmin().from("site_products").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load products." }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await params;
  const { data: project, error: ownerError } = await authorize(projectId, ownerId);
  if (ownerError) return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const product = parseProduct(await request.json().catch(() => null));
  if (!product) return NextResponse.json({ error: "Check the product name, SKU, price, currency, and image URL." }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("site_products").insert({ ...product, project_id: projectId }).select("*").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "That SKU is already in use." : "Could not save product." }, { status: error.code === "23505" ? 409 : 500 });
  return NextResponse.json({ product: data }, { status: 201 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await params;
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("id" in body) || typeof body.id !== "string") return NextResponse.json({ error: "Choose a product to update." }, { status: 400 });
  const { data: project, error: ownerError } = await authorize(projectId, ownerId);
  if (ownerError) return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const product = parseProduct(body);
  if (!product) return NextResponse.json({ error: "Check the product name, SKU, price, currency, and image URL." }, { status: 400 });
  const { data, error } = await getSupabaseAdmin().from("site_products").update(product)
    .eq("project_id", projectId).eq("id", body.id).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "That SKU is already in use." : "Could not update product." }, { status: error.code === "23505" ? 409 : 500 });
  if (!data) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  return NextResponse.json({ product: data });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await params;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Choose a product to remove." }, { status: 400 });
  const { data: project, error: ownerError } = await authorize(projectId, ownerId);
  if (ownerError) return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { data, error } = await getSupabaseAdmin().from("site_products").delete()
    .eq("project_id", projectId).eq("id", id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Could not remove product." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  return new Response(null, { status: 204 });
}