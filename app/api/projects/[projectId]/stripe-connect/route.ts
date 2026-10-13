import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/api-auth";
import { getSupabaseAdmin } from "@/lib/db";

type RouteContext = { params: Promise<{ projectId: string }> };

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

async function loadOwnedProject(projectId: string, ownerId: string) {
  return getSupabaseAdmin().from("projects")
    .select("id, name, stripe_connect_account_id")
    .eq("id", projectId)
    .eq("owner_id", ownerId)
    .maybeSingle();
}

export async function GET(_request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { projectId } = await params;
  const { data: project, error } = await loadOwnedProject(projectId, ownerId);
  if (error) return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (!project.stripe_connect_account_id) return NextResponse.json({ connected: false });
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe Connect is not configured on this server." }, { status: 503 });
  try {
    const account = await stripe.accounts.retrieve(project.stripe_connect_account_id);
    return NextResponse.json({ connected: true, detailsSubmitted: account.details_submitted, chargesEnabled: account.charges_enabled });
  } catch {
    return NextResponse.json({ error: "Could not verify the connected Stripe account." }, { status: 502 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const ownerId = await getAuthenticatedUserId();
  if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe Connect is not configured on this server." }, { status: 503 });

  const body: unknown = await request.json().catch(() => null);
  const country = body && typeof body === "object" && "country" in body && typeof body.country === "string"
    ? body.country.toUpperCase()
    : "";
  if (!/^[A-Z]{2}$/.test(country)) return NextResponse.json({ error: "Choose your business country." }, { status: 400 });

  const { projectId } = await params;
  const { data: project, error } = await loadOwnedProject(projectId, ownerId);
  if (error) return NextResponse.json({ error: "Could not load project." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || new URL(request.url).origin;
  const returnUrl = new URL(`/builder/${projectId}?stripe_connect=complete`, origin).toString();
  const refreshUrl = new URL(`/builder/${projectId}?stripe_connect=refresh`, origin).toString();
  try {
    let accountId = project.stripe_connect_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { lunio_project_id: projectId, lunio_owner_id: ownerId },
      });
      accountId = account.id;
      const { error: saveError } = await getSupabaseAdmin().from("projects")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", projectId)
        .eq("owner_id", ownerId);
      if (saveError) return NextResponse.json({ error: "Stripe created an account, but it could not be linked to this site." }, { status: 500 });
    }
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
    return NextResponse.json({ url: link.url });
  } catch {
    return NextResponse.json({ error: "Could not start Stripe onboarding. Check Stripe Connect settings and try again." }, { status: 502 });
  }
}