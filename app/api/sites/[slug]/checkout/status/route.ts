import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getPublishedProject, getPublishedSiteOrigin } from "@/lib/site-services";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  if (!getPublishedSiteOrigin(request, slug)) return NextResponse.json({ error: "Use this store from its dedicated domain." }, { status: 403 });
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) return NextResponse.json({ error: "Invalid checkout session." }, { status: 400 });
  const { data: project, error } = await getPublishedProject(slug);
  if (error) return NextResponse.json({ error: "Could not load this store." }, { status: 500 });
  if (!project?.stripe_connect_account_id) return NextResponse.json({ error: "Store payments are unavailable." }, { status: 409 });
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Store checkout is not configured." }, { status: 503 });

  try {
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {}, { stripeAccount: project.stripe_connect_account_id });
    if (session.metadata?.lunio_project_id !== project.id) return NextResponse.json({ error: "Checkout session not found." }, { status: 404 });
    return NextResponse.json({
      status: session.payment_status,
      email: session.customer_details?.email ?? null,
      amountTotal: session.amount_total,
      currency: session.currency,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not verify this checkout." }, { status: 502 });
  }
}