// src/app/api/v1/services/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authDb } from '@/lib/auth';
import { authorizeServerRoles } from '@/lib/server-auth';

export async function GET(req: NextRequest) {
  try {
    const includeInactive = req.nextUrl.searchParams.get('all') === 'true';

    if (includeInactive) {
      const check = await authorizeServerRoles(['admin']);
      if (!check.ok) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: check.status });
      }
      const services = await authDb
        .collection('services')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      return NextResponse.json({ success: true, services });
    }

    const services = await authDb
      .collection('services')
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, services });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: (err as Error).message || 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const check = await authorizeServerRoles(['admin']);
  if (!check.ok) {
    return NextResponse.json({ success: false, message: 'Admin access required' }, { status: check.status });
  }

  try {
    const body = await req.json();
    const title = String(body.title || '').trim();
    const category = String(body.category || '').trim();
    const description = String(body.description || '').trim();
    const imageUrl = String(body.imageUrl || '').trim();
    const priceCents = Number(body.priceCents);
    const durationMinutes = Number(body.durationMinutes);
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    if (!title || !category || !description || !imageUrl) {
      return NextResponse.json(
        { success: false, message: 'All fields including uploaded service image are required.' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      return NextResponse.json(
        { success: false, message: 'Price must be a positive number.' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return NextResponse.json(
        { success: false, message: 'Estimated duration must be a positive number.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const doc = {
      title,
      category,
      description,
      priceCents: Math.round(priceCents),
      durationMinutes: Math.round(durationMinutes),
      imageUrl,
      isActive,
      createdAt: now,
      updatedAt: now,
    };

    const result = await authDb.collection('services').insertOne(doc);
    return NextResponse.json(
      { success: true, service: { _id: result.insertedId.toHexString(), ...doc } },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, message: (err as Error).message || 'Failed to create service' },
      { status: 500 }
    );
  }
}