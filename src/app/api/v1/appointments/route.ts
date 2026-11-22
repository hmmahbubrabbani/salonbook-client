// src/app/api/v1/appointments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { authDb } from '@/lib/auth';
import { authorizeServerRoles } from '@/lib/server-auth';

export async function GET() {
  const check = await authorizeServerRoles(['client', 'admin']);
  if (!check.ok) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: check.status });
  }

  const filter = check.user.role === 'admin' ? {} : { clientId: check.user._id };
  const appointments = await authDb
    .collection('appointments')
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ success: true, appointments });
}

export async function POST(req: NextRequest) {
  const check = await authorizeServerRoles(['client']);
  if (!check.ok) {
    return NextResponse.json(
      { success: false, message: 'Only authenticated customers can submit appointment requests.' },
      { status: check.status }
    );
  }

  try {
    const body = await req.json();
    const serviceId = String(body.serviceId || '').trim();
    const date = String(body.date || '').trim();
    const startTime = String(body.startTime || '').trim();
    const message = String(body.message || '').trim();

    if (!ObjectId.isValid(serviceId) || !date || !startTime) {
      return NextResponse.json(
        { success: false, message: 'Service, appointment date, and time slot are required.' },
        { status: 400 }
      );
    }

    const service = await authDb.collection('services').findOne({ _id: new ObjectId(serviceId) });
    if (!service) {
      return NextResponse.json({ success: false, message: 'Service not found.' }, { status: 404 });
    }

    if (!service.isActive) {
      return NextResponse.json(
        { success: false, message: 'Inactive services cannot be booked.' },
        { status: 400 }
      );
    }

    // Prevent duplicate active appointments for the same date and time slot
    const existingConflict = await authDb.collection('appointments').findOne({
      date,
      startTime,
      status: { $in: ['Pending', 'Confirmed'] },
    });

    if (existingConflict) {
      return NextResponse.json(
        {
          success: false,
          message: `The time slot ${startTime} on ${date} is already booked. Please choose another slot.`,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const appointmentDoc = {
      clientId: check.user._id,
      customerName: check.user.name,
      customerEmail: check.user.email,
      serviceId: service._id.toHexString(),
      serviceTitle: service.title,
      serviceCategory: service.category,
      serviceImage: service.imageUrl || '',
      servicePriceCents: Number(service.priceCents),
      date,
      startTime,
      message,
      status: 'Pending',
      paymentStatus: 'Unpaid',
      createdAt: now,
      updatedAt: now,
    };

    const result = await authDb.collection('appointments').insertOne(appointmentDoc);

    return NextResponse.json(
      {
        success: true,
        appointment: { _id: result.insertedId.toHexString(), ...appointmentDoc },
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, message: (err as Error).message || 'Failed to create appointment' },
      { status: 500 }
    );
  }
}