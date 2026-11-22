// src/app/api/v1/users/route.ts
import { NextResponse } from 'next/server';
import { authDb } from '@/lib/auth';
import { authorizeServerRoles } from '@/lib/server-auth';

export async function GET() {
  const check = await authorizeServerRoles(['admin']);
  if (!check.ok) {
    return NextResponse.json({ success: false, message: 'Admin access required' }, { status: check.status });
  }

  const users = await authDb
    .collection('user')
    .find({ role: { $ne: 'admin' } }, { projection: { password: 0, passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ success: true, users });
}