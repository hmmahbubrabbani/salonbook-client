'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Calendar, Clock, Loader2, ShieldAlert } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { toast } from '@/hooks/use-toast';
import { AVAILABLE_TIME_SLOTS, type Service, type UserRole } from '@/types/salonbook';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80';

interface ServerAuthUser {
  _id: string;
  name: string;
  email: string;
  role?: UserRole;
  isBlocked?: boolean;
}

function getApiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}

function ServiceDetailsContent() {
  const params = useParams<{ id: string }>();
  const serviceId = params?.id;
  const pathname = usePathname();
  const router = useRouter();
  const { data: sessionData, isPending } = useSession();

  const [serverUser, setServerUser] = useState<ServerAuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [service, setService] = useState<Service | null>(null);
  const [imgSrc, setImgSrc] = useState<string>(FALLBACK_IMAGE);
  const [loadingService, setLoadingService] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showBookingForm, setShowBookingForm] = useState(false);
  const [date, setDate] = useState('');
  const [minDate, setMinDate] = useState('');
  const [startTime, setStartTime] = useState<string>(AVAILABLE_TIME_SLOTS[0]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    setMinDate(localDate);
  }, []);

  useEffect(() => {
    if (isPending) return;

    let active = true;
    setAuthChecked(false);
    setServerUser(null);

    const redirectToLogin = () => {
      const currentPath = pathname || (serviceId ? `/services/${serviceId}` : '/services');
      const targetLogin = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
      router.replace(targetLogin);
      if (typeof window !== 'undefined') {
        window.location.replace(targetLogin);
      }
    };

    const sessionEmail = sessionData?.user?.email?.toLowerCase().trim() || '';

    (async () => {
      try {
        let user: ServerAuthUser | undefined;

        const meRes = await fetch(getApiUrl('/api/v1/auth/me'), {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });

        if (meRes.ok) {
          const meData = await meRes.json().catch(() => ({}));
          if (meData?.success && meData?.user) {
            user = meData.user as ServerAuthUser;
          }
        }

        // If salonbook_token belongs to an old logged-out admin or is missing, sync with current Better Auth session
        if (sessionEmail && (!user || user.email?.toLowerCase().trim() !== sessionEmail)) {
          const syncRes = await fetch(getApiUrl('/api/v1/auth/sync-session'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            cache: 'no-store',
            body: JSON.stringify({ email: sessionEmail }),
          });

          if (syncRes.ok) {
            const syncData = await syncRes.json().catch(() => ({}));
            if (syncData?.user) {
              user = syncData.user as ServerAuthUser;
            }
          }
        }

        if (!active) return;

        if (!user || user.isBlocked) {
          redirectToLogin();
          return;
        }

        setServerUser(user);
        setAuthChecked(true);
      } catch {
        if (!active) return;
        redirectToLogin();
      }
    })();

    return () => {
      active = false;
    };
  }, [isPending, sessionData?.user?.email, pathname, serviceId, router]);

  useEffect(() => {
    if (!authChecked || !serverUser || serverUser.isBlocked || !serviceId) return;

    let active = true;
    setLoadingService(true);
    setErrorMsg(null);

    fetch(getApiUrl(`/api/v1/services/${encodeURIComponent(serviceId)}`), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.service) {
          throw new Error(data.message || 'Invalid service ID.');
        }
        return data.service as Service;
      })
      .then((item) => {
        if (!active) return;
        setService({
          ...item,
          _id: String(item._id),
          priceCents: Number(item.priceCents) || 0,
          durationMinutes: Number(item.durationMinutes) || 0,
        });
        setImgSrc(item.imageUrl || FALLBACK_IMAGE);
      })
      .catch((err: Error) => {
        if (active) setErrorMsg(err.message);
      })
      .finally(() => {
        if (active) setLoadingService(false);
      });

    return () => {
      active = false;
    };
  }, [authChecked, serverUser, serviceId]);

  async function handleSubmitAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !serverUser) return;

    const effectiveRole: UserRole = String(serverUser.role || 'client').toLowerCase() === 'admin' ? 'admin' : 'client';

    if (serverUser.isBlocked) {
      toast({
        title: 'Account blocked',
        description: 'Your account is blocked. Please contact support.',
        variant: 'destructive',
      });
      const currentPath = pathname || (serviceId ? `/services/${serviceId}` : '/services');
      router.replace(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (effectiveRole === 'admin') {
      toast({
        title: 'Customers only',
        description: 'Admins cannot submit customer appointment requests.',
        variant: 'destructive',
      });
      return;
    }

    if (!service.isActive) {
      toast({
        title: 'Service inactive',
        description: 'Only active services can be booked.',
        variant: 'destructive',
      });
      return;
    }

    if (!date || !startTime) {
      toast({
        title: 'Missing details',
        description: 'Please select both an appointment date and time slot.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/appointments'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service._id,
          date,
          startTime,
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message || `Could not submit appointment request (HTTP ${res.status}).`
        );
      }

      toast({
        title: 'Appointment Request Submitted',
        description: 'Status: Pending. Once confirmed by Admin, you can pay from your dashboard.',
        variant: 'success',
      });
      window.location.assign('/dashboard/client');
    } catch (err) {
      toast({
        title: 'Booking failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
      setSubmitting(false);
    }
  }

  if (isPending || !authChecked || !serverUser || serverUser.isBlocked) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Verifying sign-in...</span>
      </div>
    );
  }

  if (loadingService) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading service details...</span>
      </div>
    );
  }

  if (errorMsg || !service) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-12">
        <div className="flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{errorMsg || 'Invalid service ID.'}</span>
        </div>
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Browse Services</span>
        </Link>
      </div>
    );
  }

  const effectiveRole: UserRole =
    String(serverUser.role || 'client').toLowerCase() === 'admin' ? 'admin' : 'client';
  const isAdmin = effectiveRole === 'admin';
  const canBook = service.isActive && !isAdmin;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <Link
        href="/services"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Browse Services</span>
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="relative h-80 w-full overflow-hidden rounded-2xl border bg-muted">
            <Image
              src={imgSrc}
              alt={service.title}
              fill
              className="object-cover"
              unoptimized
              onError={() => {
                if (imgSrc !== FALLBACK_IMAGE) {
                  setImgSrc(FALLBACK_IMAGE);
                }
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">
              {service.category}
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" /> Estimated Duration: {service.durationMinutes} mins
            </span>
            <span className="ml-auto text-xl font-bold">
              ${(service.priceCents / 100).toFixed(2)}
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight">{service.title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">{service.description}</p>
        </div>

        <div className="h-fit space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Appointment Booking</h2>

          {!service.isActive && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3.5 text-sm text-amber-800 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>This service is currently inactive and unavailable for booking.</span>
            </div>
          )}

          {isAdmin && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3.5 text-sm text-destructive">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Admins cannot submit customer appointment requests.</span>
            </div>
          )}

          {!showBookingForm ? (
            <button
              type="button"
              disabled={!canBook}
              onClick={() => setShowBookingForm(true)}
              className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Book This Service
            </button>
          ) : (
            <form onSubmit={handleSubmitAppointment} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium">Appointment Date</label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                  <input
                    type="date"
                    required
                    min={minDate || undefined}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-md border bg-background py-2 pr-3 pl-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">Available Time Slot</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {AVAILABLE_TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">
                  Additional Message (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Any stylist notes or preferences..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{submitting ? 'Submitting...' : 'Submit Appointment Request'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBookingForm(false)}
                  className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ServiceDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Verifying sign-in...</span>
        </div>
      }
    >
      <ServiceDetailsContent />
    </Suspense>
  );
}