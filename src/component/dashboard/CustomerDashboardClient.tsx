'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CreditCard, Eye, Loader2, XCircle } from 'lucide-react';
import { ProfileForm } from '@/component/dashboard/ProfileForm';
import { toast } from '@/hooks/use-toast';
import type { Appointment, User } from '@/types/salonbook';

function getApiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}

export function CustomerDashboardClient({
  initialUser,
  activeTab,
}: {
  initialUser: User;
  activeTab: string;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User>(initialUser);
  const [tab, setTab] = useState(activeTab);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  const syncServerProfile = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl('/api/v1/auth/me'), {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (res.status === 401) {
        window.location.replace('/login?callbackUrl=%2Fdashboard%2Fclient');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success && data?.user) {
        setUser((prev) => ({ ...prev, ...data.user, _id: String(data.user._id || prev._id) }));
      }
    } catch {
      // Keep initialUser if transient network error occurs
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/appointments'), {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (res.status === 401) {
        window.location.replace('/login?callbackUrl=%2Fdashboard%2Fclient');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to load appointments.');

      const rawList = Array.isArray(data.appointments) ? (data.appointments as Appointment[]) : [];
      const list: Appointment[] = rawList.map((item) => ({
        ...item,
        _id: String(item._id),
        servicePriceCents: Number(item.servicePriceCents) || 0,
      }));
      setAppointments(list);

      setSelectedAppt((prev) => {
        if (!prev) return null;
        return list.find((item) => item._id === prev._id) ?? null;
      });
    } catch (err) {
      toast({
        title: 'Error loading appointments',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncServerProfile();
    fetchAppointments();
  }, [syncServerProfile, fetchAppointments]);

  async function handleProfileUpdated(updated: Partial<User>) {
    setUser((prev) => ({
      ...prev,
      ...updated,
    }));
    await syncServerProfile();
    router.refresh();
  }

  async function handleCancelPending(id: string) {
    setCancellingId(id);
    try {
      const res = await fetch(getApiUrl(`/api/v1/appointments/${encodeURIComponent(id)}`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' }),
      });

      if (res.status === 401) {
        window.location.replace('/login?callbackUrl=%2Fdashboard%2Fclient');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not cancel appointment.');

      toast({
        title: 'Appointment cancelled',
        description: 'Your pending request has been cancelled.',
        variant: 'success',
      });
      await fetchAppointments();
    } catch (err) {
      toast({
        title: 'Cancel failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setCancellingId(null);
    }
  }

  async function handlePayNow(appointmentId: string) {
    setPayingId(appointmentId);
    try {
      const res = await fetch(getApiUrl('/api/v1/payments/checkout'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId }),
      });

      if (res.status === 401) {
        window.location.replace('/login?callbackUrl=%2Fdashboard%2Fclient');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.message || 'Could not start Stripe Checkout.');
      }

      toast({
        title: 'Redirecting to Stripe',
        description: 'Please complete your payment securely.',
        variant: 'default',
      });
      window.location.href = data.url;
    } catch (err) {
      toast({
        title: 'Payment error',
        description: (err as Error).message,
        variant: 'destructive',
      });
      setPayingId(null);
    }
  }

  const totalCount = appointments.length;
  const pendingCount = appointments.filter((a) => a.status === 'Pending').length;
  const confirmedCount = appointments.filter((a) => a.status === 'Confirmed').length;
  const cancelledCount = appointments.filter((a) => a.status === 'Cancelled').length;

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading dashboard data...</span>
        </div>
      ) : tab === 'overview' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">Total Appointment Requests</p>
            <p className="mt-1 text-2xl font-bold">{totalCount}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">Pending Appointments</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{pendingCount}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">Confirmed Appointments</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{confirmedCount}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">Cancelled Appointments</p>
            <p className="mt-1 text-2xl font-bold text-rose-600">{cancelledCount}</p>
          </div>
        </div>
      ) : tab === 'appointments' ? (
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
              You have not submitted any appointment requests yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="p-3">Service</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Requested</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => {
                    const canCancel = appt.status === 'Pending';
                    const canPay =
                      appt.status === 'Confirmed' && appt.paymentStatus === 'Unpaid';

                    return (
                      <tr key={appt._id} className="border-b last:border-0">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            {appt.serviceImage && (
                              <Image
                                src={appt.serviceImage}
                                alt={appt.serviceTitle}
                                width={36}
                                height={36}
                                unoptimized
                                className="h-9 w-9 rounded border object-cover"
                              />
                            )}
                            <span className="font-medium">{appt.serviceTitle}</span>
                          </div>
                        </td>
                        <td className="p-3">{appt.serviceCategory}</td>
                        <td className="p-3">
                          {appt.date} · {appt.startTime}
                        </td>
                        <td className="p-3">${(appt.servicePriceCents / 100).toFixed(2)}</td>
                        <td className="p-3 font-medium">{appt.status}</td>
                        <td className="p-3">{appt.paymentStatus}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {new Date(appt.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedAppt({ ...appt })}
                              className="inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs hover:bg-accent"
                            >
                              <Eye className="h-3.5 w-3.5" /> Details
                            </button>

                            {canCancel && (
                              <button
                                type="button"
                                disabled={cancellingId === appt._id}
                                onClick={() => handleCancelPending(appt._id)}
                                className="inline-flex items-center gap-1 rounded border border-destructive/50 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                {cancellingId === appt._id ? 'Cancelling...' : 'Cancel'}
                              </button>
                            )}

                            {canPay && (
                              <button
                                type="button"
                                disabled={payingId === appt._id}
                                onClick={() => handlePayNow(appt._id)}
                                className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                {payingId === appt._id ? 'Processing...' : 'Pay Now'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selectedAppt && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setSelectedAppt(null)}
            >
              <div
                className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 text-sm shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-base font-semibold">Appointment Details</h3>
                  <button
                    type="button"
                    onClick={() => setSelectedAppt(null)}
                    className="rounded-md border px-2.5 py-1 text-xs hover:bg-accent"
                  >
                    Close
                  </button>
                </div>

                <div className="flex items-center gap-3.5">
                  {selectedAppt.serviceImage && (
                    <Image
                      src={selectedAppt.serviceImage}
                      alt={selectedAppt.serviceTitle}
                      width={56}
                      height={56}
                      unoptimized
                      className="h-14 w-14 rounded-lg border object-cover"
                    />
                  )}
                  <div>
                    <p className="text-base font-semibold">{selectedAppt.serviceTitle}</p>
                    <p className="text-xs text-muted-foreground">{selectedAppt.serviceCategory}</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border bg-muted/30 p-3.5">
                  <p>
                    <strong>Date & Time:</strong> {selectedAppt.date} at {selectedAppt.startTime}
                  </p>
                  <p>
                    <strong>Price:</strong> ${(selectedAppt.servicePriceCents / 100).toFixed(2)}
                  </p>
                  <p>
                    <strong>Appointment Status:</strong>{' '}
                    <span className="font-semibold">{selectedAppt.status}</span>
                  </p>
                  <p>
                    <strong>Payment Status:</strong>{' '}
                    <span className="font-semibold">{selectedAppt.paymentStatus}</span>
                  </p>
                  <p>
                    <strong>Requested On:</strong>{' '}
                    {new Date(selectedAppt.createdAt).toLocaleString()}
                  </p>
                  {selectedAppt.message && (
                    <p>
                      <strong>Your Note:</strong> {selectedAppt.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {selectedAppt.status === 'Pending' && (
                    <button
                      type="button"
                      disabled={cancellingId === selectedAppt._id}
                      onClick={() => handleCancelPending(selectedAppt._id)}
                      className="inline-flex items-center gap-1 rounded-md border border-destructive/50 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {cancellingId === selectedAppt._id ? 'Cancelling...' : 'Cancel Appointment'}
                    </button>
                  )}

                  {selectedAppt.status === 'Confirmed' &&
                    selectedAppt.paymentStatus === 'Unpaid' && (
                      <button
                        type="button"
                        disabled={payingId === selectedAppt._id}
                        onClick={() => handlePayNow(selectedAppt._id)}
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        {payingId === selectedAppt._id ? 'Processing...' : 'Pay Now'}
                      </button>
                    )}

                  <button
                    type="button"
                    onClick={() => setSelectedAppt(null)}
                    className="rounded-md border px-3.5 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ProfileForm user={user} onUpdated={handleProfileUpdated} />
      )}
    </div>
  );
}