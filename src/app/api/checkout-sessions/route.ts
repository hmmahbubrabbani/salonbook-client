import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe'; // অথবা '../../../lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const origin = req.headers.get('origin') || req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: Array.isArray(body.line_items) ? body.line_items : [],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/cancel`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create checkout session.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}