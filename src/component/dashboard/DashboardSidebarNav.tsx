'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  PlusCircle,
  Scissors,
  UserCircle,
  Users,
} from 'lucide-react';

const ICONS = {
  overview: LayoutDashboard,
  services: Scissors,
  'add-service': PlusCircle,
  appointments: CalendarCheck,
  users: Users,
  transactions: CreditCard,
  profile: UserCircle,
} as const;

export interface SidebarNavItem {
  href: string;
  label: string;
  tabKey: keyof typeof ICONS;
  dividerBefore?: boolean;
}

export function DashboardSidebarNav({ links }: { links: SidebarNavItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  return (
    <nav
      aria-label="Dashboard navigation"
      className="flex flex-row gap-1 overflow-x-auto md:flex-col"
    >
      {links.map((item) => {
        const Icon = ICONS[item.tabKey];
        const basePath = item.href.split('?')[0];
        const isActive = pathname === basePath && currentTab === item.tabKey;

        return (
          <div key={item.href}>
            {item.dividerBefore && (
              <div className="my-2 hidden border-t border-border md:block" />
            )}
            <Link
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}