// src/app/api/v1/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ObjectId } from 'mongodb';
import { authDb } from '@/lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function recordVerifiedPayment(session: Stripe.Checkout.Session) {
  const appointmentId = session.metadata?.appointmentId;
  if (!appointmentId || !ObjectId.isValid(appointmentId)) return null;

  const appointmentsCol = authDb.collection('appointments');
  const transactionsCol = authDb.collection('transactions');

  const appointment = await appointmentsCol.findOne({ _id: new ObjectId(appointmentId) });
  if (!appointment) return null;

  const now = new Date().toISOString();
  await appointmentsCol.updateOne(
    { _id: appointment._id },
    {
      $set: {
        paymentStatus: 'Paid',
        stripeSessionId: session.id,
        updatedAt: now,
      },
    }
  );

  await transactionsCol.updateOne(
    { stripeSessionId: session.id },
    {
      $setOnInsert: {
        appointmentId: appointment._id.toHexString(),
        clientId: appointment.clientId,
        customerName: appointment.customerName,
        customerEmail: appointment.customerEmail,
        serviceId: appointment.serviceId,
        serviceTitle: appointment.serviceTitle,
        appointmentDate: appointment.date,
        amountCents: session.amount_total ?? Number(appointment.servicePriceCents),
        currency: (session.currency || 'usd').toUpperCase(),
        stripeSessionId: session.id,
        paymentStatus: 'Paid',
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return transactionsCol.findOne({ stripeSessionId: session.id });
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === 'paid') {
      await recordVerifiedPayment(session);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}