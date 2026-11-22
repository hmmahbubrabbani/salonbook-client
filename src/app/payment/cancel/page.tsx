'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm space-y-4">
        <XCircle className="mx-auto h-12 w-12 text-amber-600" />
        <h1 className="text-2xl font-bold">Payment Cancelled</h1>
        <p className="text-sm text-muted-foreground">
          Your Stripe payment was cancelled and no charge was made. Your confirmed appointment
          remains unpaid and can be paid anytime from My Appointments.
        </p>
        <Link
          href="/dashboard/client?tab=appointments"
          className="inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Return to My Appointments
        </Link>
      </div>
    </div>
  );
}