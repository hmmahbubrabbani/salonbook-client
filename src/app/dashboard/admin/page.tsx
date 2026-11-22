import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { requireServerPageRoles } from '@/lib/server-auth';
import { AdminDashboardClient } from '@/component/dashboard/AdminDashboardClient';
import type { User } from '@/types/salonbook';

const VALID_TABS = new Set([
  'overview',
  'services',
  'add-service',
  'appointments',
  'users',
  'transactions',
  'profile',
]);

async function AdminDashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [authUser, resolvedParams] = await Promise.all([
    requireServerPageRoles(['admin'], '/dashboard/admin'),
    searchParams,
  ]);

  const activeTab =
    resolvedParams?.tab && VALID_TABS.has(resolvedParams.tab)
      ? resolvedParams.tab
      : 'overview';

  const initialUser: User = {
    _id: String(authUser._id),
    name: authUser.name,
    email: authUser.email,
    role: 'admin',
    phone: authUser.phone ?? '',
    avatarUrl: authUser.avatarUrl ?? '',
    isBlocked: Boolean(authUser.isBlocked),
  };

  return <AdminDashboardClient initialUser={initialUser} activeTab={activeTab} />;
}

export default function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading admin dashboard...</span>
        </div>
      }
    >
      <AdminDashboardContent searchParams={searchParams} />
    </Suspense>
  );
}