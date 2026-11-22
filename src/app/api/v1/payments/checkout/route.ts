// src/app/api/v1/payments/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ObjectId } from 'mongodb';
import { authDb } from '@/lib/auth';
import { authorizeServerRoles } from '@/lib/server-auth';

export async function POST(req: NextRequest) {
  const check = await authorizeServerRoles(['client']);
  if (!check.ok) {
    return NextResponse.json(
      { success: false, message: 'Customer login required' },
      { status: check.status }
    );
  }

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { success: false, message: 'Stripe is not configured on the server.' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey);

    const { appointmentId } = (await req.json()) as { appointmentId?: string };
    if (!appointmentId || !ObjectId.isValid(appointmentId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid appointment ID.' },
        { status: 400 }
      );
    }

    const appointment = await authDb
      .collection('appointments')
      .findOne({ _id: new ObjectId(appointmentId) });

    if (!appointment) {
      return NextResponse.json(
        { success: false, message: 'Appointment not found.' },
        { status: 404 }
      );
    }

    if (appointment.clientId !== check.user._id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    if (appointment.status !== 'Confirmed') {
      return NextResponse.json(
        { success: false, message: 'Only Confirmed appointments can be paid.' },
        { status: 400 }
      );
    }

    if (appointment.paymentStatus === 'Paid') {
      return NextResponse.json(
        { success: false, message: 'This appointment is already paid.' },
        { status: 400 }
      );
    }

    const unitAmount = Math.round(Number(appointment.servicePriceCents));
    if (!Number.isFinite(unitAmount) || unitAmount < 50) {
      return NextResponse.json(
        { success: false, message: 'Invalid service price for Stripe checkout.' },
        { status: 400 }
      );
    }

    const origin = req.headers.get('origin');
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      origin ||
      'http://localhost:3000'
    ).replace(/\/$/, '');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: check.user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${appointment.serviceTitle} (${appointment.date} at ${appointment.startTime})`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        appointmentId: appointment._id.toHexString(),
        clientId: check.user._id,
      },
      success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/payment/cancel?appointmentId=${appointment._id.toHexString()}`,
    });

    await authDb.collection('appointments').updateOne(
      { _id: appointment._id },
      { $set: { stripeSessionId: session.id, updatedAt: new Date().toISOString() } }
    );

    return NextResponse.json({ success: true, url: session.url });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: (err as Error).message || 'Failed to initiate Stripe checkout',
      },
      { status: 500 }
    );
  }
}