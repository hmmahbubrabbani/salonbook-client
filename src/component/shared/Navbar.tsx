'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Scissors,
  Sun,
  X,
} from 'lucide-react';
import { useSession, signOut } from '@/lib/auth-client';
import { toast } from '@/hooks/use-toast';

interface SessionUserWithMeta {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role?: 'client' | 'admin';
  avatarUrl?: string;
  image?: string;
  isBlocked?: boolean;
}

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'salonbook-theme';

function getApiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}

function getUserAvatar(user: SessionUserWithMeta | null | undefined) {
  return String(user?.avatarUrl || user?.image || '').trim();
}

function getUserInitial(name?: string) {
  const trimmed = String(name || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : 'U';
}

function applyThemeToDocument(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.style.colorScheme = mode;
}

function ThemeToggleButton({
  theme,
  onToggle,
}: {
  theme: ThemeMode;
  onToggle: () => void;
}) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light Mode' : 'Dark Mode'}
      className="inline-flex items-center justify-center rounded-md border bg-background p-2 text-foreground transition-colors hover:bg-accent"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-500" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 dark:text-slate-200" />
      )}
    </button>
  );
}

function UserAvatarBadge({
  user,
  sizeClass = 'h-6 w-6 text-xs',
}: {
  user: SessionUserWithMeta;
  sizeClass?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const avatarSrc = getUserAvatar(user);

  useEffect(() => {
    setImgFailed(false);
  }, [avatarSrc]);

  if (avatarSrc && !imgFailed) {
    return (
      <img
        src={avatarSrc}
        alt={user.name || 'User profile'}
        onError={() => setImgFailed(true)}
        className={`${sizeClass} shrink-0 rounded-full border object-cover`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary`}
    >
      {getUserInitial(user.name)}
    </span>
  );
}

export function Navbar() {
  const { data: session, isPending } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [backendUser, setBackendUser] = useState<SessionUserWithMeta | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  function closeMenus() {
    setDropdownOpen(false);
    setMobileOpen(false);
  }

  useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        setTheme(saved);
        applyThemeToDocument(saved);
        return;
      }
      const prefersDark =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialMode: ThemeMode = prefersDark ? 'dark' : 'light';
      setTheme(initialMode);
      applyThemeToDocument(initialMode);
    } catch {
      applyThemeToDocument('light');
    }
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;

    function handlePointerDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  function handleToggleTheme() {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      applyThemeToDocument(next);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }

  const sessionUser = session?.user as SessionUserWithMeta | undefined;

  useEffect(() => {
    if (isPending) return;

    let active = true;
    setCheckingBackend(true);

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
          if (data?.success && data?.user) {
            const meUser = data.user as SessionUserWithMeta;
            const sessionEmail = sessionUser?.email?.toLowerCase().trim();

            if (!sessionEmail || meUser.email?.toLowerCase().trim() === sessionEmail) {
              setBackendUser(meUser);
              setCheckingBackend(false);
              return;
            }
          }
        }

        if (sessionUser?.email) {
          const normalizedEmail = sessionUser.email.toLowerCase().trim();
          const syncRes = await fetch(getApiUrl('/api/v1/auth/sync-session'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            cache: 'no-store',
            body: JSON.stringify({ email: normalizedEmail }),
          });

          if (!active) return;

          if (syncRes.ok) {
            const syncData = await syncRes.json().catch(() => null);
            if (syncData?.user) {
              setBackendUser(syncData.user as SessionUserWithMeta);
              setCheckingBackend(false);
              return;
            }
          }
        }

        setBackendUser(null);
      } catch {
        if (active) setBackendUser(null);
      } finally {
        if (active) setCheckingBackend(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isPending, sessionUser?.email]);

  const mergedUser: SessionUserWithMeta | null = backendUser
    ? {
        ...(sessionUser || {}),
        ...backendUser,
        avatarUrl: getUserAvatar(backendUser) || getUserAvatar(sessionUser),
      }
    : sessionUser || null;

  const user = mergedUser && !mergedUser.isBlocked ? mergedUser : null;
  const dashboardHref = user?.role === 'admin' ? '/dashboard/admin' : '/dashboard/client';
  const showAuthLoading = isPending || checkingBackend;

  async function handleLogout() {
    closeMenus();
    setBackendUser(null);

    try {
      await fetch(getApiUrl('/api/v1/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Continue sign-out even if backend logout fails
    }

    try {
      await signOut();
    } catch {
      // Ignore Better Auth signOut error
    }

    toast({
      title: 'Signed out',
      description: 'You have been logged out of SalonBook.',
      variant: 'success',
    });

    window.location.replace('/login');
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          onClick={closeMenus}
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <Scissors className="h-5 w-5 text-primary" />
          <span>SalonBook</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
          <Link href="/" onClick={closeMenus} className="transition-colors hover:text-primary">
            Home
          </Link>
          <Link
            href="/services"
            onClick={closeMenus}
            className="transition-colors hover:text-primary"
          >
            Browse Services
          </Link>

          {!showAuthLoading && !user && (
            <>
              <Link
                href="/login"
                onClick={closeMenus}
                className="transition-colors hover:text-primary"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={closeMenus}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"
              >
                Sign Up
              </Link>
            </>
          )}

          {!showAuthLoading && user && (
            <>
              <Link
                href={dashboardHref}
                onClick={closeMenus}
                className="transition-colors hover:text-primary"
              >
                Dashboard
              </Link>

              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm hover:bg-accent"
                >
                  <UserAvatarBadge user={user} sizeClass="h-6 w-6 text-xs" />
                  <span>{user.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md border bg-popover p-1 shadow-md">
                    <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
                      <UserAvatarBadge user={user} sizeClass="h-7 w-7 text-xs" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{user.name}</p>
                        <p className="truncate text-[11px]">{user.email}</p>
                      </div>
                    </div>
                    <Link
                      href={dashboardHref}
                      onClick={closeMenus}
                      className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-destructive hover:bg-accent"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {mounted && <ThemeToggleButton theme={theme} onToggle={handleToggleTheme} />}
        </nav>

        {/* Mobile Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          {mounted && <ThemeToggleButton theme={theme} onToggle={handleToggleTheme} />}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-md p-2"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="space-y-2 border-t bg-background px-4 py-4 text-sm md:hidden">
          <Link href="/" onClick={closeMenus} className="block py-1.5">
            Home
          </Link>
          <Link href="/services" onClick={closeMenus} className="block py-1.5">
            Browse Services
          </Link>

          {!showAuthLoading && !user ? (
            <div className="flex flex-col gap-2 pt-2">
              <Link href="/login" onClick={closeMenus} className="py-1.5">
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={closeMenus}
                className="rounded-md bg-primary px-4 py-2 text-center text-primary-foreground"
              >
                Sign Up
              </Link>
            </div>
          ) : (
            !showAuthLoading &&
            user && (
              <div className="space-y-2 border-t pt-2">
                <div className="flex items-center gap-2 py-1">
                  <UserAvatarBadge user={user} sizeClass="h-7 w-7 text-xs" />
                  <p className="text-xs font-medium text-foreground">{user.name}</p>
                </div>
                <Link href={dashboardHref} onClick={closeMenus} className="block py-1.5">
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block py-1.5 text-destructive"
                >
                  Logout
                </button>
              </div>
            )
          )}
        </div>
      )}
    </header>
  );
}