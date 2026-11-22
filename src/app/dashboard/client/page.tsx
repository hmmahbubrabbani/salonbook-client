import { Suspense } from 'react';
import { connection } from 'next/server';
import { Loader2 } from 'lucide-react';
import { requireServerPageRoles } from '@/lib/server-auth';
import { CustomerDashboardClient } from '@/component/dashboard/CustomerDashboardClient';
import type { User } from '@/types/salonbook';

const VALID_CLIENT_TABS = new Set(['overview', 'appointments', 'profile']);

async function CustomerDashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await connection();

  const [authUser, resolvedParams] = await Promise.all([
    requireServerPageRoles(['client'], '/dashboard/client'),
    searchParams,
  ]);

  const activeTab =
    resolvedParams?.tab && VALID_CLIENT_TABS.has(resolvedParams.tab)
      ? resolvedParams.tab
      : 'overview';

  const initialUser: User = {
    _id: String(authUser._id),
    name: authUser.name,
    email: authUser.email,
    role: 'client',
    phone: authUser.phone ?? '',
    avatarUrl: authUser.avatarUrl ?? '',
    isBlocked: Boolean(authUser.isBlocked),
  };

  return <CustomerDashboardClient initialUser={initialUser} activeTab={activeTab} />;
}

export default function CustomerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading customer dashboard...</span>
        </div>
      }
    >
      <CustomerDashboardContent searchParams={searchParams} />
    </Suspense>
  );
}