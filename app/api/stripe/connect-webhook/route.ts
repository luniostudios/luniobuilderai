import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secretKey || !webhookSecret || !signature) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });

  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  const accountId = event.account;
  if (!accountId) return NextResponse.json({ received: true });
  const supabase = getSupabaseAdmin();

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const projectId = session.metadata?.lunio_project_id;
    if (!projectId) return NextResponse.json({ received: true });
    const { data: project, error: projectError } = await supabase.from("projects")
      .select("id").eq("id", projectId).eq("stripe_connect_account_id", accountId).maybeSingle();
    if (projectError) return NextResponse.json({ error: "Could not verify store account." }, { status: 500 });
    if (!project) return NextResponse.json({ received: true });

    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
    const paid = event.type !== "checkout.session.async_payment_failed" && session.payment_status === "paid";
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 }, { stripeAccount: accountId });
    const items = lineItems.data.map((item) => ({
      description: item.description ?? "Item",
      quantity: item.quantity ?? 1,
      amount_total: item.amount_total ?? 0,
      currency: item.currency ?? session.currency ?? "usd",
    }));
    const sessionWithShipping = session as Stripe.Checkout.Session & {
      collected_information?: { shipping_details?: { address?: unknown } | null } | null;
    };
    const { error } = await supabase.from("site_orders").upsert({
      project_id: project.id,
      checkout_session_id: session.id,
      payment_intent_id: paymentIntentId,
      customer_email: session.customer_details?.email ?? session.customer_email ?? null,
      status: paid ? "paid" : "payment_failed",
      amount_total: session.amount_total ?? 0,
      currency: session.currency ?? "usd",
      items,
      shipping_address: sessionWithShipping.collected_information?.shipping_details?.address ?? {},
    }, { onConflict: "checkout_session_id" });
    if (error) return NextResponse.json({ error: "Could not save order." }, { status: 500 });
    return NextResponse.json({ received: true });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    if (!charge.refunded) return NextResponse.json({ received: true });
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) return NextResponse.json({ received: true });
    const { data: project, error: projectError } = await supabase.from("projects")
      .select("id").eq("stripe_connect_account_id", accountId).maybeSingle();
    if (projectError) return NextResponse.json({ error: "Could not verify store account." }, { status: 500 });
    if (!project) return NextResponse.json({ received: true });
    const { error } = await supabase.from("site_orders").update({ status: "refunded" })
      .eq("project_id", project.id).eq("payment_intent_id", paymentIntentId);
    if (error) return NextResponse.json({ error: "Could not update refunded order." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}