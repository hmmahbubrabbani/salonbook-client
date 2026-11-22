import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { stripe } from '../../../lib/stripe';

type SuccessPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

async function CheckoutSuccessDetails({ searchParams }: SuccessPageProps) {
  const { session_id } = await searchParams;

  if (!session_id) {
    throw new Error('Please provide a valid session_id (`cs_test_...`)');
  }

  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ['line_items', 'payment_intent'],
  });

  if (session.status === 'open') {
    return redirect('/');
  }

  if (session.status === 'complete') {
    const customerEmail =
      session.customer_details?.email ?? session.customer_email ?? 'your email';

    return (
      <section id="success">
        <p>
          We appreciate your business! A confirmation email will be sent to{' '}
          {customerEmail}. If you have any questions, please email{' '}
          <a href="mailto:orders@example.com">orders@example.com</a>.
        </p>
      </section>
    );
  }

  return null;
}

export default function Success({ searchParams }: SuccessPageProps) {
  return (
    <Suspense fallback={<p>Loading payment confirmation...</p>}>
      <CheckoutSuccessDetails searchParams={searchParams} />
    </Suspense>
  );
}