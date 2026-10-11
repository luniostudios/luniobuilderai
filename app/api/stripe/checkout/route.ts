import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_TARGETS = {
  monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  annually: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
};

const resolvePriceId = async (target: string) => {
  if (target.startsWith('price_')) {
    return target;
  }

  if (target.startsWith('prod_')) {
    const prices = await stripe.prices.list({
      product: target,
      active: true,
      type: 'recurring',
      limit: 10,
    });

    const monthlyPrice = prices.data.find(price => price.recurring?.interval === 'month');
    const yearlyPrice = prices.data.find(price => price.recurring?.interval === 'year');

    if (monthlyPrice && yearlyPrice) {
      return { monthly: monthlyPrice.id, annually: yearlyPrice.id };
    }

    if (prices.data.length === 1 && prices.data[0].recurring) {
      return prices.data[0].id;
    }

    return null;
  }

  return null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const billing = body?.billing === 'annually' ? 'annually' : 'monthly';
    const email = body?.email || null;
    const target = PRICE_TARGETS[billing];

    if (!target) {
      return NextResponse.json(
        { error: 'Stripe price ID not configured for this billing interval.' },
        { status: 500 }
      );
    }

    const resolved = await resolvePriceId(target);
    let priceId: string | null = null;

    if (typeof resolved === 'string') {
      priceId = resolved;
    } else if (resolved && typeof resolved === 'object') {
      priceId = resolved[billing] || null;
    }

    if (!priceId) {
      return NextResponse.json(
        { error: 'Unable to resolve Stripe price ID for the selected plan.' },
        { status: 500 }
      );
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${origin}/dashboard?checkout_success=true`;
    const cancelUrl = `${origin}/pricing?checkout_canceled=true`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email || undefined,
      allowed_payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          plan: 'pro',
          billing_interval: billing,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Unable to create Stripe checkout session.' },
      { status: 500 }
    );
  }
}
