import { Suspense } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { getServerAuthUser } from '@/lib/server-auth';

const SERVER_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'https://salonbook-backend-rho.vercel.app'
)
  .trim()
  .replace(/\/$/, '');

async function AuthCallbackResolver({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const user = await getServerAuthUser();

  if (!user) {
    redirect('/login');
  }

  if (user.isBlocked) {
    try {
      await auth.api.signOut({ headers: await headers() });
    } catch {
      // Ignore signOut failure during blocked user redirect
    }

    redirect(
      `/login?error=${encodeURIComponent(
        'Your account is blocked. Please contact SalonBook support.'
      )}`
    );
  }

  // Sync salonbook_token cookie with salonbook-server after OAuth login
  try {
    const reqHeaders = await headers();
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieHeader =
      reqHeaders.get('cookie') ||
      allCookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const syncRes = await fetch(`${SERVER_URL}/api/v1/auth/sync-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ email: user.email }),
      cache: 'no-store',
    });

    if (syncRes.ok) {
      const setCookieHeader = syncRes.headers.get('set-cookie');
      if (setCookieHeader) {
        const match = setCookieHeader.match(/salonbook_token=([^;]+)/);
        if (match?.[1]) {
          cookieStore.set('salonbook_token', match[1], {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60,
          });
        }
      }
    } else {
      console.error('[AuthCallback] sync-session failed with status:', syncRes.status);
    }
  } catch (err) {
    console.error('[AuthCallback] sync-session error:', err);
  }

  if (user.role === 'admin') {
    redirect('/dashboard/admin');
  }

  const nextPath =
    params.callbackUrl &&
    params.callbackUrl.startsWith('/') &&
    !params.callbackUrl.startsWith('/dashboard/admin')
      ? params.callbackUrl
      : '/dashboard/client';

  redirect(nextPath);

  return null;
}

export default function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Completing sign-in...</span>
        </div>
      }
    >
      <AuthCallbackResolver searchParams={searchParams} />
    </Suspense>
  );
}