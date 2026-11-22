// src/app/api/v1/appointments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { authDb } from '@/lib/auth';
import { authorizeServerRoles } from '@/lib/server-auth';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const check = await authorizeServerRoles(['client', 'admin']);
  if (!check.ok) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: check.status });
  }

  const { id } = await context.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: 'Invalid appointment ID.' }, { status: 400 });
  }

  const appointmentsCol = authDb.collection('appointments');
  const appointment = await appointmentsCol.findOne({ _id: new ObjectId(id) });
  if (!appointment) {
    return NextResponse.json({ success: false, message: 'Appointment not found.' }, { status: 404 });
  }

  const body = await req.json();
  const nextStatus = String(body.status || '');

  // Customer rules: can only cancel their own Pending appointment
  if (check.user.role === 'client') {
    if (appointment.clientId !== check.user._id) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }
    if (nextStatus !== 'Cancelled') {
      return NextResponse.json(
        { success: false, message: 'Customers can only cancel pending appointments.' },
        { status: 400 }
      );
    }
    if (appointment.status !== 'Pending') {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot cancel an appointment that is already ${appointment.status}.`,
        },
        { status: 400 }
      );
    }
  }

  // Admin rules: can confirm Pending appointments, or cancel Pending/Confirmed appointments
  if (check.user.role === 'admin') {
    if (nextStatus === 'Confirmed' && appointment.status !== 'Pending') {
      return NextResponse.json(
        { success: false, message: 'Only Pending appointments can be confirmed.' },
        { status: 400 }
      );
    }
    if (
      nextStatus === 'Cancelled' &&
      !['Pending', 'Confirmed'].includes(String(appointment.status))
    ) {
      return NextResponse.json(
        { success: false, message: 'This appointment cannot be cancelled.' },
        { status: 400 }
      );
    }
    if (!['Confirmed', 'Cancelled'].includes(nextStatus)) {
      return NextResponse.json({ success: false, message: 'Invalid status update.' }, { status: 400 });
    }
  }

  const updated = await appointmentsCol.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status: nextStatus, updatedAt: new Date().toISOString() } },
    { returnDocument: 'after' }
  );

  return NextResponse.json({ success: true, appointment: updated });
}