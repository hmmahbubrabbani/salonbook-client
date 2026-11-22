// src/app/api/v1/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { authDb } from '@/lib/auth';
import { authorizeServerRoles } from '@/lib/server-auth';

function getUserFilter(userId: string, email: string) {
  return ObjectId.isValid(userId)
    ? { $or: [{ _id: new ObjectId(userId) }, { id: userId }, { email }] }
    : { $or: [{ id: userId }, { email }] };
}

export async function GET() {
  const check = await authorizeServerRoles(['client', 'admin']);
  if (!check.ok) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: check.status }
    );
  }

  const dbUser = await authDb
    .collection('user')
    .findOne(getUserFilter(check.user._id, check.user.email));

  return NextResponse.json({
    success: true,
    user: {
      _id: check.user._id,
      name: String(dbUser?.name ?? check.user.name),
      email: check.user.email,
      role: check.user.role,
      phone: String(dbUser?.phone ?? ''),
      avatarUrl: String(dbUser?.avatarUrl ?? dbUser?.image ?? check.user.avatarUrl ?? ''),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const check = await authorizeServerRoles(['client', 'admin']);
  if (!check.ok) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized' },
      { status: check.status }
    );
  }

  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const rawAvatarUrl = body.avatarUrl;

    if (!name) {
      return NextResponse.json({ success: false, message: 'Name is required.' }, { status: 400 });
    }

    const filter = getUserFilter(check.user._id, check.user.email);
    const existing = await authDb.collection('user').findOne(filter);
    const nextAvatarUrl =
      rawAvatarUrl !== undefined
        ? String(rawAvatarUrl || '').trim()
        : String(existing?.avatarUrl ?? existing?.image ?? check.user.avatarUrl ?? '');

    const updated = await authDb.collection('user').findOneAndUpdate(
      filter,
      {
        $set: {
          name,
          phone,
          image: nextAvatarUrl,
          avatarUrl: nextAvatarUrl,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    const doc = (updated as { value?: Record<string, unknown> } | null)?.value ?? updated;

    return NextResponse.json({
      success: true,
      user: {
        _id: check.user._id,
        name: String(doc?.name ?? name),
        email: check.user.email,
        role: check.user.role,
        phone: String(doc?.phone ?? phone),
        avatarUrl: String(doc?.avatarUrl ?? doc?.image ?? nextAvatarUrl),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: (err as Error).message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}