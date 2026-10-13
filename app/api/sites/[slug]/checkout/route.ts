import Stripe from "stripe";
import { NextResponse } from "next/server";
import { allowPublicSubmission, getPublishedProject, getPublishedSiteOrigin } from "@/lib/site-services";
import { getSupabaseAdmin } from "@/lib/db";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const origin = getPublishedSiteOrigin(request, slug);
  if (!origin) return NextResponse.json({ error: "Use this store from its dedicated domain." }, { status: 403 });
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "Store checkout is not configured." }, { status: 503 });
  const stripe = new Stripe(stripeKey);

  const { data: project, error: projectError } = await getPublishedProject(slug);
  if (projectError) return NextResponse.json({ error: "Could not load this store." }, { status: 500 });
  if (!project) return NextResponse.json({ error: "This store is not published." }, { status: 404 });
  if (!project.stripe_connect_account_id) return NextResponse.json({ error: "The store owner has not connected payments yet." }, { status: 409 });

  const { data: account, error: accountError } = await getSupabaseAdmin().from("projects")
    .select("stripe_connect_account_id").eq("id", project.id).maybeSingle();
  if (accountError || !account?.stripe_connect_account_id) return NextResponse.json({ error: "Store payments are unavailable." }, { status: 503 });

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("items" in body) || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
    return NextResponse.json({ error: "Your cart is empty or invalid." }, { status: 400 });
  }
  if (!await allowPublicSubmission(project.id, request)) return NextResponse.json({ error: "Too many checkout attempts. Please wait a minute." }, { status: 429 });

  const quantities = new Map<string, number>();
  for (const item of body.items) {
    if (!item || typeof item !== "object" || !("productId" in item) || typeof item.productId !== "string" || !("quantity" in item) || typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      return NextResponse.json({ error: "Your cart contains an invalid item." }, { status: 400 });
    }
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    if ((quantities.get(item.productId) ?? 0) > 20) return NextResponse.json({ error: "A product quantity exceeds the limit." }, { status: 400 });
  }

  const { data: products, error: productsError } = await getSupabaseAdmin().from("site_products")
    .select("id, name, description, image_url, amount_cents, currency, requires_shipping")
    .eq("project_id", project.id).eq("active", true).in("id", [...quantities.keys()]);
  if (productsError) return NextResponse.json({ error: "Could not verify cart products." }, { status: 500 });
  if (!products || products.length !== quantities.size) return NextResponse.json({ error: "A product is no longer available." }, { status: 409 });
  const currency = products[0]?.currency;
  if (!currency || products.some((product) => product.currency !== currency)) return NextResponse.json({ error: "Products in one checkout must use the same currency." }, { status: 400 });

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = products.map((product) => ({
    quantity: quantities.get(product.id),
    price_data: {
      currency: product.currency,
      unit_amount: product.amount_cents,
      product_data: {
        name: product.name,
        description: product.description || undefined,
        images: product.image_url ? [product.image_url] : undefined,
      },
    },
  }));
  const physicalItems = products.some((product) => product.requires_shipping);
  const countries = (process.env.STORE_SHIPPING_COUNTRIES ?? "US,CA,GB,AU,NZ")
    .split(",").map((country) => country.trim().toUpperCase()).filter((country) => /^[A-Z]{2}$/.test(country));

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      billing_address_collection: "required",
      shipping_address_collection: physicalItems ? { allowed_countries: countries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] } : undefined,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancelled`,
      client_reference_id: project.id,
      metadata: { lunio_project_id: project.id, lunio_project_slug: slug },
      payment_intent_data: { metadata: { lunio_project_id: project.id, lunio_project_slug: slug } },
    }, { stripeAccount: project.stripe_connect_account_id });
    if (!session.url) return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "Could not start checkout. Confirm the Stripe account can accept payments." }, { status: 502 });
  }
}