// src/app/api/v1/users/[id]/block/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { authDb } from '@/lib/auth';
import { authorizeServerRoles } from '@/lib/server-auth';

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
    return NextResponse.json({ success: false, message: 'Invalid user ID.' }, { status: 400 });
  }

  const { isBlocked } = (await req.json()) as { isBlocked: boolean };
  const updated = await authDb
    .collection('user')
    .findOneAndUpdate(
      { _id: new ObjectId(id), role: { $ne: 'admin' } },
      { $set: { isBlocked: Boolean(isBlocked), updatedAt: new Date() } },
      { returnDocument: 'after', projection: { password: 0, passwordHash: 0 } }
    );

  if (!updated) {
    return NextResponse.json({ success: false, message: 'Customer not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, user: updated });
}