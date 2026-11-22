// src/app/api/v1/payments/verify/route.ts (Used by Payment Success Page to verify session with Stripe)
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { authorizeServerRoles } from '@/lib/server-auth';
import { recordVerifiedPayment } from '@/app/api/v1/payments/webhook/route';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: NextRequest) {
  const check = await authorizeServerRoles(['client', 'admin']);
  if (!check.ok) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: check.status });
  }

  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ success: false, message: 'Missing session_id' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { success: false, message: 'Payment has not been completed.' },
        { status: 400 }
      );
    }

    const transaction = await recordVerifiedPayment(session);
    return NextResponse.json({ success: true, transaction });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: (err as Error).message || 'Could not verify Stripe session' },
      { status: 400 }
    );
  }
}