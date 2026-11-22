'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { signIn, signOut, authClient, useSession } from '@/lib/auth-client';
import { toast } from '@/hooks/use-toast';
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

/**
 * Mirror salonbook_token onto this (Next.js) origin so server components can see it.
 * Returns false when the cookie was NOT set — callers must not redirect in that case,
 * otherwise the dashboard bounces back to /login forever (refresh loop).
 */
async function syncFrontendSessionCookie(token?: string): Promise<boolean> {
  if (!token) return false;
  try {
    const res = await fetch('/api/auth/session-cookie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return Boolean(data?.success);
  } catch {
    return false;
  }
}

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard/client';
  const { data: session, isPending } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(searchParams.get('error'));
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (isPending || submitting) return;

    let active = true;

    (async () => {
      try {
        const res = await fetch(getApiUrl('/api/v1/auth/me'), {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (!active) return;

        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.success && data?.user && !data.user.isBlocked) {
            const synced = await syncFrontendSessionCookie(data.token);
            if (!synced) {
              // Cookie not set -> dashboard would redirect straight back here.
              console.warn('[Login] session-cookie sync failed, staying on login form');
              setErrorMsg('Your session could not be restored. Please sign in again.');
              return;
            }
            const role = String(data.user.role || 'client').toLowerCase() as UserRole;
            setRedirecting(true);
            window.location.replace(resolveDestination(role, callbackUrl));
            return;
          }
        }

        if (session?.user?.email) {
          const syncRes = await fetch(getApiUrl('/api/v1/auth/sync-session'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            cache: 'no-store',
            body: JSON.stringify({
              email: session.user.email.trim().toLowerCase(),
              name: session.user.name || undefined,
              avatarUrl: session.user.image || undefined,
            }),
          });

          if (!active) return;

          if (syncRes.ok) {
            const syncData = await syncRes.json().catch(() => null);
            if (syncData?.success && syncData?.user && !syncData.user.isBlocked) {
              const synced = await syncFrontendSessionCookie(syncData.token);
              if (!synced) {
                console.warn('[Login] session-cookie sync failed, staying on login form');
                setErrorMsg('Your session could not be restored. Please sign in again.');
                return;
              }
              const role = String(syncData.user.role || 'client').toLowerCase() as UserRole;
              setRedirecting(true);
              window.location.replace(resolveDestination(role, callbackUrl));
              return;
            }
          } else {
            const errData = await syncRes.json().catch(() => null);
            console.warn('[Login] sync-session failed:', syncRes.status, errData?.message);
          }
        }
      } catch (err) {
        console.warn('[Login] Session check error:', err);
      } finally {
        if (active) setCheckingSession(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [
    isPending,
    submitting,
    session?.user?.email,
    session?.user?.name,
    session?.user?.image,
    callbackUrl,
  ]);

  async function handleCredentialLogin(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1) Authenticate with salonbook-server (sets salonbook_token cookie & returns token)
      const apiRes = await fetch(getApiUrl('/api/v1/auth/login'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const apiData = await apiRes.json().catch(() => ({}));

      if (!apiRes.ok || !apiData?.success || !apiData?.user) {
        if (apiRes.status === 403) {
          await signOut().catch(() => {});
          await fetch('/api/auth/session-cookie', { method: 'DELETE' }).catch(() => {});
        }
        const msg = apiData?.message || 'Invalid email or password.';
        setErrorMsg(msg);
        toast({ title: 'Sign in failed', description: msg, variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      // 2) Set salonbook_token on the Next.js frontend domain so Server Components (getServerAuthUser) see it
      const synced = await syncFrontendSessionCookie(apiData.token);
      if (!synced) {
        const msg =
          'Signed in, but your session could not be started on this site. Please try again.';
        setErrorMsg(msg);
        toast({ title: 'Sign in failed', description: msg, variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      // 3) Keep Better Auth session in sync
      const baSignIn = await signIn
        .email({ email: cleanEmail, password })
        .catch(() => ({ error: { message: 'Session sync failed' } }));

      if (baSignIn?.error) {
        await authClient.signUp
          .email({
            email: cleanEmail,
            password,
            name: apiData.user.name || cleanEmail.split('@')[0],
          })
          .catch(() => {});
      }

      const role = String(apiData.user.role || 'client').toLowerCase() as UserRole;
      const destination = resolveDestination(role, callbackUrl);

      setEmail('');
      setPassword('');
      setSuccessMsg('Signed in successfully! Redirecting...');
      setRedirecting(true);
      toast({
        title: 'Signed in',
        description: `Welcome back, ${apiData.user.name}.`,
        variant: 'success',
      });

      window.location.replace(destination);
    } catch (err) {
      const msg = (err as Error).message || 'Unable to sign in.';
      setErrorMsg(msg);
      toast({ title: 'Sign in error', description: msg, variant: 'destructive' });
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    if (submitting) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      // Use Express backend directly - form data parsing works on Vercel,
      // while Better Auth /api/auth/ routes have JSON body parsing issues
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          email: email,
          password: password,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const msg = data.message || 'Google login failed.';
        setErrorMsg(msg);
        toast({ title: 'Google login failed', description: msg, variant: 'destructive' });
        setSubmitting(false);
        return;
      }

      // After successful login, sync the session cookie and redirect
      const syncRes = await fetch('/api/auth/session-token', {
        cache: 'no-store',
      }).catch(() => null);
      const sessionToken = syncRes?.json?.success ? null : '';
      
      if (sessionToken) {
        await fetch('/api/auth/sync-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken }),
          cache: 'no-store',
        }).catch(() => {});
      }

      setSuccessMsg('Signed in successfully!');
      toast({
        title: 'Welcome to SalonBook',
        description: 'Your account is ready.',
        variant: 'success',
      });

      const callbackUrl = 'dashboard/client';
      const role = 'client';
      window.location.replace(
        role === 'admin'
          ? '/dashboard/admin'
          : '/dashboard/client'
      );
    } catch (err) {
      const msg = (err as Error).message || 'Google login failed.';
      setErrorMsg(msg);
      toast({ title: 'Google login error', description: msg, variant: 'destructive' });
      setSubmitting(false);
    }
  }

  if (isPending || checkingSession || redirecting) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 px-4 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span>{redirecting ? 'Redirecting to your dashboard...' : 'Checking session...'}</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sign In to SalonBook</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in with your credentials or Google account.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleCredentialLogin} autoComplete="off" className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium">Email</label>
            <input
              type="email"
              name="salonbook_login_email"
              autoComplete="off"
              required
              disabled={submitting}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="salonbook_login_password"
                autoComplete="new-password"
                required
                disabled={submitting}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={submitting}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={submitting}
          className="w-full rounded-md border bg-background py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {submitting ? 'Connecting to Google...' : 'Sign In with Google'}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          New to SalonBook?{' '}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center gap-2 px-4 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span>Loading...</span>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}