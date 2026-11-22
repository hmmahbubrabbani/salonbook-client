// src/app/api/v1/transactions/route.ts
import { NextResponse } from 'next/server';
import { authDb } from '@/lib/auth';
import { authorizeServerRoles } from '@/lib/server-auth';

export async function GET() {
  const check = await authorizeServerRoles(['admin']);
  if (!check.ok) {
    return NextResponse.json({ success: false, message: 'Admin access required' }, { status: check.status });
  }

  const transactions = await authDb
    .collection('transactions')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ success: true, transactions });
}