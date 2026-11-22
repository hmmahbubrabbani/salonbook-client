import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getServerAuthUser } from '@/lib/server-auth';

async function DashboardRoleRedirect() {
  const user = await getServerAuthUser();

  if (!user) {
    redirect('/login?callbackUrl=%2Fdashboard');
  }

  redirect(user.role === 'admin' ? '/dashboard/admin' : '/dashboard/client');

  return null;
}

export default function DashboardRootPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Redirecting to your dashboard...</span>
        </div>
      }
    >
      <DashboardRoleRedirect />
    </Suspense>
  );
}