// src/app/api/v1/services/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { authDb } from '@/lib/auth';
import { authorizeServerRoles } from '@/lib/server-auth';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: 'Invalid service ID.' }, { status: 400 });
  }

  const service = await authDb.collection('services').findOne({ _id: new ObjectId(id) });
  if (!service) {
    return NextResponse.json({ success: false, message: 'Service not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, service });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const check = await authorizeServerRoles(['admin']);
  if (!check.ok) {
    return NextResponse.json({ success: false, message: 'Admin access required' }, { status: check.status });
  }

  const { id } = await context.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: 'Invalid service ID.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.category !== undefined) updates.category = String(body.category).trim();
    if (body.description !== undefined) updates.description = String(body.description).trim();
    if (body.imageUrl !== undefined) updates.imageUrl = String(body.imageUrl).trim();
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

    if (body.priceCents !== undefined) {
      const priceCents = Number(body.priceCents);
      if (!Number.isFinite(priceCents) || priceCents <= 0) {
        return NextResponse.json(
          { success: false, message: 'Price must be a positive number.' },
          { status: 400 }
        );
      }
      updates.priceCents = Math.round(priceCents);
    }

    if (body.durationMinutes !== undefined) {
      const durationMinutes = Number(body.durationMinutes);
      if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        return NextResponse.json(
          { success: false, message: 'Duration must be a positive number.' },
          { status: 400 }
        );
      }
      updates.durationMinutes = Math.round(durationMinutes);
    }

    const updated = await authDb
      .collection('services')
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updates },
        { returnDocument: 'after' }
      );

    if (!updated) {
      return NextResponse.json({ success: false, message: 'Service not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, service: updated });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: (err as Error).message || 'Failed to update service' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const check = await authorizeServerRoles(['admin']);
  if (!check.ok) {
    return NextResponse.json({ success: false, message: 'Admin access required' }, { status: check.status });
  }

  const { id } = await context.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, message: 'Invalid service ID.' }, { status: 400 });
  }

  const result = await authDb.collection('services').deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    return NextResponse.json({ success: false, message: 'Service not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Service deleted.' });
}