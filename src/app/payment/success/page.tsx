'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Transaction } from '@/types/salonbook';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [verifying, setVerifying] = useState(true);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setErrorMsg('Missing Stripe Checkout session ID.');
      setVerifying(false);
      return;
    }

    fetch(`/api/v1/payments/verify?session_id=${encodeURIComponent(sessionId)}`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.transaction) {
          throw new Error(data.message || 'Payment verification failed.');
        }
        setTransaction(data.transaction as Transaction);
        toast({
          title: 'Payment confirmed',
          description: 'Your transaction has been recorded.',
          variant: 'success',
        });
      })
      .catch((err: Error) => {
        setErrorMsg(err.message);
        toast({
          title: 'Verification error',
          description: err.message,
          variant: 'destructive',
        });
      })
      .finally(() => setVerifying(false));
  }, [sessionId]);

  if (verifying) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Verifying Stripe payment...</span>
      </div>
    );
  }

  if (errorMsg || !transaction) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center space-y-3 text-destructive">
          <AlertCircle className="mx-auto h-10 w-10" />
          <h1 className="text-xl font-bold">Payment Verification Failed</h1>
          <p className="text-sm">{errorMsg || 'Unable to confirm payment.'}</p>
          <Link
            href="/dashboard/client?tab=appointments"
            className="inline-block rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Back to My Appointments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm space-y-4">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h1 className="text-2xl font-bold">Payment Successful</h1>
        <p className="text-sm text-muted-foreground">
          Thank you! Your salon appointment payment has been confirmed.
        </p>

        <div className="rounded-lg bg-muted/40 p-4 text-left text-sm space-y-1.5">
          <p>
            <strong>Service:</strong> {transaction.serviceTitle}
          </p>
          <p>
            <strong>Appointment Date:</strong> {transaction.appointmentDate}
          </p>
          <p>
            <strong>Amount Paid:</strong> ${(transaction.amountCents / 100).toFixed(2)}{' '}
            {transaction.currency}
          </p>
          <p>
            <strong>Payment Status:</strong> {transaction.paymentStatus}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            Ref: {transaction.stripeSessionId}
          </p>
        </div>

        <Link
          href="/dashboard/client?tab=appointments"
          className="inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Go to My Appointments
        </Link>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading payment receipt...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}