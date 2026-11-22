'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import type { UserRole } from '@/types/salonbook';

function getApiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}

function resolveDestination(role: UserRole, callbackUrl: string) {
  if (role === 'admin') {
    return '/dashboard/admin';
  }
  // Never redirect back to an auth page — that would create a refresh loop.
  const unsafeCallback =
    !callbackUrl.startsWith('/') ||
    callbackUrl.startsWith('/dashboard/admin') ||
    callbackUrl.startsWith('/login') ||
    callbackUrl.startsWith('/signup');
  if (unsafeCallback) {
    return '/dashboard/client';
  }
  return callbackUrl;
}

function goLogin(error?: string) {
  window.location.replace(
    error
      ? `/login?error=${encodeURIComponent(error)}`
      : '/login'
  );
}

/**
 * Runs after Better Auth finishes the Google round-trip.
 *
 * 1. Read the httpOnly Better Auth token (same-origin route).
 * 2. POST it to salonbook-server → that response Set-Cookies salonbook_token on
 *    the API origin (browser stores it because credentials:'include').
 * 3. Mirror the token onto this origin so Server Components can see it too.
 * 4. Redirect to the dashboard.
 */
function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard/client';
  const [status, setStatus] = useState('Completing sign-in...');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const tokenRes = await fetch('/api/auth/session-token', { cache: 'no-store' });
        const tokenData = await tokenRes.json().catch(() => null);
        const sessionToken = String(tokenData?.token || '');

        if (!sessionToken) {
          goLogin('Your Google session could not be restored. Please sign in again.');
          return;
        }

        setStatus('Restoring your session...');

        const syncRes = await fetch(getApiUrl('/api/v1/auth/sync-session'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({ sessionToken }),
        });

        if (syncRes.status === 403) {
          const blocked = await syncRes.json().catch(() => null);
          await authClient.signOut().catch(() => {});
          await fetch('/api/auth/session-cookie', { method: 'DELETE', cache: 'no-store' }).catch(
            () => {}
          );
          goLogin(
            blocked?.message || 'Your account has been blocked. Please contact support.'
          );
          return;
        }

        const syncData = await syncRes.json().catch(() => null);
        if (!syncRes.ok || !syncData?.success || !syncData?.user) {
          goLogin(syncData?.message || 'Could not restore your session. Please sign in again.');
          return;
        }

        await fetch('/api/auth/session-cookie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: syncData.token }),
          cache: 'no-store',
        }).catch(() => {});

        const role = String(syncData.user.role || 'client').toLowerCase() as UserRole;
        setStatus('Redirecting to your dashboard...');
        window.location.replace(resolveDestination(role, callbackUrl));
      } catch (err) {
        console.warn('[AuthCallback] error:', err);
        goLogin('Could not restore your session. Please sign in again.');
      }
    })();
  }, [callbackUrl]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center gap-2 px-4 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <span>{status}</span>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center gap-2 px-4 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Loading...</span>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
