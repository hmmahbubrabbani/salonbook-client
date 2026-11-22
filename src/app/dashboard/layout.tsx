import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { getServerAuthUser } from '@/lib/server-auth';
import {
  DashboardSidebarNav,
  type SidebarNavItem,
} from '@/component/dashboard/DashboardSidebarNav';

const CLIENT_NAV: SidebarNavItem[] = [
  { href: '/dashboard/client?tab=overview', label: 'Dashboard Overview', tabKey: 'overview' },
  { href: '/dashboard/client?tab=appointments', label: 'My Appointments', tabKey: 'appointments' },
  {
    href: '/dashboard/client?tab=profile',
    label: 'My Profile',
    tabKey: 'profile',
    dividerBefore: true,
  },
];

const ADMIN_NAV: SidebarNavItem[] = [
  { href: '/dashboard/admin?tab=overview', label: 'Overview', tabKey: 'overview' },
  { href: '/dashboard/admin?tab=services', label: 'Manage Services', tabKey: 'services' },
  { href: '/dashboard/admin?tab=add-service', label: 'Add/Update Service', tabKey: 'add-service' },
  { href: '/dashboard/admin?tab=appointments', label: 'Manage Appointments', tabKey: 'appointments' },
  { href: '/dashboard/admin?tab=users', label: 'Manage Users', tabKey: 'users' },
  { href: '/dashboard/admin?tab=transactions', label: 'Transactions', tabKey: 'transactions' },
  {
    href: '/dashboard/admin?tab=profile',
    label: 'My Profile',
    tabKey: 'profile',
    dividerBefore: true,
  },
];

async function DashboardSidebarSection() {
  const user = await getServerAuthUser();

  if (!user || user.isBlocked) {
    return null;
  }

  const isAdmin = user.role === 'admin';
  const links = isAdmin ? ADMIN_NAV : CLIENT_NAV;

  return (
    <aside className="w-full border-b bg-muted/30 p-4 md:w-64 md:border-b-0 md:border-r">
      <div className="mb-4 border-b pb-3">
        <p className="text-sm font-bold tracking-tight">
          {isAdmin ? 'Admin Dashboard' : 'Customer Dashboard'}
        </p>
        <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{user.name}</p>
      </div>

      <Suspense fallback={null}>
        <DashboardSidebarNav links={links} />
      </Suspense>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col md:flex-row">
      <Suspense
        fallback={
          <aside className="w-full border-b bg-muted/30 p-4 md:w-64 md:border-b-0 md:border-r">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Loading menu...</span>
            </div>
          </aside>
        }
      >
        <DashboardSidebarSection />
      </Suspense>

      <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  );
}