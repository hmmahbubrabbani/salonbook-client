import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { auth, authDb } from '@/lib/auth';
import type { UserRole } from '@/types/salonbook';

export interface ServerAuthUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatarUrl: string;
  isBlocked: boolean;
}

function getApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_URL as string)
    .trim()
    .replace(/\/$/, '');
}

export async function getServerAuthUser(): Promise<ServerAuthUser | null> {
  try {
    const reqHeaders = await headers();

    // 1. Primary: Active Better Auth session (Google OAuth or synced email/password)
    const session = await auth.api
      .getSession({
        headers: reqHeaders,
      })
      .catch(() => null);

    if (session?.user?.email) {
      const normalizedEmail = session.user.email.toLowerCase().trim();
      const idConditions: Record<string, unknown>[] = [];

      if (session.user.id) {
        idConditions.push({ id: session.user.id });
        if (ObjectId.isValid(session.user.id)) {
          idConditions.push({ _id: new ObjectId(session.user.id) });
        }
      }

      let dbUser: Record<string, unknown> | null = null;
      try {
        dbUser = await authDb.collection('user').findOne({
          $or: [...idConditions, { email: normalizedEmail }],
        });
      } catch {
        dbUser = null;
      }

      const sessionExtras = session.user as { role?: string; isBlocked?: boolean };
      const rawRole = String(dbUser?.role ?? sessionExtras.role ?? 'client')
        .toLowerCase()
        .trim();
      const role: UserRole = rawRole === 'admin' ? 'admin' : 'client';
      const isBlocked = Boolean(dbUser?.isBlocked ?? sessionExtras.isBlocked);

      return {
        _id: String(dbUser?._id ?? dbUser?.id ?? session.user.id),
        name: String(dbUser?.name ?? session.user.name ?? ''),
        email: String(dbUser?.email ?? session.user.email),
        phone: String(dbUser?.phone ?? ''),
        avatarUrl: String(dbUser?.image ?? dbUser?.avatarUrl ?? session.user.image ?? ''),
        role,
        isBlocked,
      };
    }

    // 2. Fallback: Verify salonbook_token cookie via salonbook-server (/api/v1/auth/me)
    const cookieHeader = reqHeaders.get('cookie') || '';
    if (!cookieHeader.includes('salonbook_token=')) {
      return null;
    }

    const meRes = await fetch(`${getApiBaseUrl()}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        cookie: cookieHeader,
      },
      cache: 'no-store',
    }).catch(() => null);

    if (!meRes || !meRes.ok) {
      return null;
    }

    const meData = await meRes.json().catch(() => null);
    const apiUser = meData?.user as Record<string, unknown> | undefined;

    if (!meData?.success || !apiUser?.email) {
      return null;
    }

    const rawRole = String(apiUser.role ?? 'client')
      .toLowerCase()
      .trim();
    const role: UserRole = rawRole === 'admin' ? 'admin' : 'client';

    return {
      _id: String(apiUser._id ?? apiUser.id ?? ''),
      name: String(apiUser.name ?? ''),
      email: String(apiUser.email),
      phone: String(apiUser.phone ?? ''),
      avatarUrl: String(apiUser.avatarUrl ?? apiUser.image ?? ''),
      role,
      isBlocked: Boolean(apiUser.isBlocked),
    };
  } catch {
    return null;
  }
}

// API Routes (/api/v1/*) এর জন্য
export async function authorizeServerRoles(allowedRoles: UserRole[]): Promise<
  | { ok: true; user: ServerAuthUser }
  | {
      ok: false;
      status: 401 | 403;
      reason: 'UNAUTHENTICATED' | 'BLOCKED' | 'FORBIDDEN';
      user?: ServerAuthUser;
    }
> {
  const user = await getServerAuthUser();

  if (!user) {
    return { ok: false, status: 401, reason: 'UNAUTHENTICATED' };
  }

  if (user.isBlocked) {
    return { ok: false, status: 403, reason: 'BLOCKED', user };
  }

  if (!allowedRoles.includes(user.role)) {
    return { ok: false, status: 403, reason: 'FORBIDDEN', user };
  }

  return { ok: true, user };
}

// Server Pages (admin/page.tsx, client/page.tsx) এর জন্য
export async function requireServerPageRoles(
  allowedRoles: UserRole[],
  callbackPath = '/dashboard'
): Promise<ServerAuthUser> {
  const check = await authorizeServerRoles(allowedRoles);

  if (!check.ok) {
    if (check.reason === 'UNAUTHENTICATED') {
      redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
    }
    if (check.reason === 'BLOCKED') {
      redirect(
        `/login?error=${encodeURIComponent(
          'Your account has been blocked. Please contact support.'
        )}`
      );
    }
    redirect(check.user?.role === 'admin' ? '/dashboard/admin' : '/dashboard/client');
  }

  return check.user;
}