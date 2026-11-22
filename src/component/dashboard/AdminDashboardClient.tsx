'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { ProfileForm } from '@/component/dashboard/ProfileForm';
import { toast } from '@/hooks/use-toast';
import {
  SERVICE_CATEGORIES,
  type Appointment,
  type Service,
  type Transaction,
  type User,
} from '@/types/salonbook';

type AdminTab =
  | 'overview'
  | 'services'
  | 'add-service'
  | 'appointments'
  | 'users'
  | 'transactions'
  | 'profile';

const VALID_ADMIN_TABS: AdminTab[] = [
  'overview',
  'services',
  'add-service',
  'appointments',
  'users',
  'transactions',
  'profile',
];

function getApiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}

function normalizeAdminTab(rawTab: string): AdminTab {
  if (rawTab === 'add-service' || rawTab === 'upsert-service') return 'add-service';
  return VALID_ADMIN_TABS.includes(rawTab as AdminTab) ? (rawTab as AdminTab) : 'overview';
}

export function AdminDashboardClient({
  initialUser,
  activeTab,
}: {
  initialUser: User;
  activeTab: string;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User>(initialUser);
  const [tab, setTab] = useState<AdminTab>(() => normalizeAdminTab(activeTab));
  const [loading, setLoading] = useState(true);

  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);

  // Add / Update Service form state
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(SERVICE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [priceDollars, setPriceDollars] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [savingService, setSavingService] = useState(false);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    setTab(normalizeAdminTab(activeTab));
  }, [activeTab]);

  const handleAuthFailure = useCallback((status: number) => {
    if (status === 401) {
      window.location.replace('/login?callbackUrl=%2Fdashboard%2Fadmin');
      return true;
    }
    return false;
  }, []);

  const loadAllAdminData = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        const reqOpts: RequestInit = { method: 'GET', credentials: 'include', cache: 'no-store' };
        const [meRes, svcRes, apptRes, usrRes, txRes] = await Promise.all([
          fetch(getApiUrl('/api/v1/auth/me'), reqOpts),
          fetch(getApiUrl('/api/v1/services?all=true'), reqOpts),
          fetch(getApiUrl('/api/v1/appointments'), reqOpts),
          fetch(getApiUrl('/api/v1/users'), reqOpts),
          fetch(getApiUrl('/api/v1/transactions'), reqOpts),
        ]);

        if (handleAuthFailure(meRes.status)) return;

        if (meRes.ok) {
          const meData = await meRes.json().catch(() => ({}));
          if (meData?.user) {
            setUser((prev) => ({
              ...prev,
              ...meData.user,
              _id: String(meData.user._id || prev._id),
            }));
          }
        }

        if (svcRes.ok) {
          const svcData = await svcRes.json().catch(() => ({}));
          const list = Array.isArray(svcData.services) ? (svcData.services as Service[]) : [];
          setServices(
            list.map((s) => ({
              ...s,
              _id: String(s._id),
              priceCents: Number(s.priceCents) || 0,
              durationMinutes: Number(s.durationMinutes) || 0,
            }))
          );
        }

        if (apptRes.ok) {
          const apptData = await apptRes.json().catch(() => ({}));
          const rawAppts = Array.isArray(apptData.appointments)
            ? (apptData.appointments as Appointment[])
            : [];
          const nextAppts = rawAppts.map((a) => ({
            ...a,
            _id: String(a._id),
            servicePriceCents: Number(a.servicePriceCents) || 0,
          }));
          setAppointments(nextAppts);
          setSelectedAppt((prev) =>
            prev ? nextAppts.find((item) => item._id === prev._id) ?? null : null
          );
        }

        if (usrRes.ok) {
          const usrData = await usrRes.json().catch(() => ({}));
          const rawUsers = Array.isArray(usrData.users) ? (usrData.users as User[]) : [];
          const nextUsers = rawUsers.map((u) => ({
            ...u,
            _id: String(u._id),
          }));
          setCustomers(nextUsers);
          setSelectedCustomer((prev) =>
            prev ? nextUsers.find((item) => item._id === prev._id) ?? null : null
          );
        }

        if (txRes.ok) {
          const txData = await txRes.json().catch(() => ({}));
          const rawTx = Array.isArray(txData.transactions)
            ? (txData.transactions as Transaction[])
            : [];
          setTransactions(
            rawTx.map((t) => ({
              ...t,
              _id: String(t._id),
              amountCents: Number(t.amountCents) || 0,
            }))
          );
        }
      } catch (err) {
        toast({
          title: 'Failed to load admin data',
          description: (err as Error).message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [handleAuthFailure]
  );

  useEffect(() => {
    loadAllAdminData(true);
  }, [loadAllAdminData]);

  function handleSelectTab(nextTab: AdminTab) {
    setTab(nextTab);
    router.replace(`/dashboard/admin?tab=${nextTab}`, { scroll: false });
  }

  async function handleProfileUpdated(updated: Partial<User>) {
    setUser((prev) => ({
      ...prev,
      ...updated,
    }));
    await loadAllAdminData(false);
    router.refresh();
  }

  function resetServiceForm() {
    setEditingServiceId(null);
    setTitle('');
    setCategory(SERVICE_CATEGORIES[0]);
    setDescription('');
    setPriceDollars('');
    setDurationMinutes('45');
    setImageUrl('');
    setIsActive(true);
  }

  function openNewServiceTab() {
    resetServiceForm();
    handleSelectTab('add-service');
  }

  function startEditService(svc: Service) {
    setEditingServiceId(svc._id);
    setTitle(svc.title);
    setCategory(svc.category);
    setDescription(svc.description);
    setPriceDollars((svc.priceCents / 100).toFixed(2));
    setDurationMinutes(String(svc.durationMinutes));
    setImageUrl(svc.imageUrl || '');
    setIsActive(Boolean(svc.isActive));
    handleSelectTab('add-service');
  }

  async function handleServiceImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append('image', file);

      const res = await fetch(getApiUrl('/api/v1/upload'), {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });

      if (handleAuthFailure(res.status)) return;

      const data = await res.json().catch(() => ({}));
      const uploadedUrl =
        data?.url || data?.data?.display_url || data?.data?.url || '';

      if (!res.ok || !uploadedUrl) {
        throw new Error(data.message || 'Image upload failed.');
      }

      setImageUrl(String(uploadedUrl).trim());
      toast({ title: 'Image uploaded', description: 'Service image uploaded.', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  }

  async function handleSaveService(e: React.FormEvent) {
    e.preventDefault();
    const numericPrice = parseFloat(priceDollars);
    const numericDuration = parseInt(durationMinutes, 10);

    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a service name.',
        variant: 'destructive',
      });
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      toast({
        title: 'Invalid price',
        description: 'Price must be positive.',
        variant: 'destructive',
      });
      return;
    }
    if (!Number.isFinite(numericDuration) || numericDuration <= 0) {
      toast({
        title: 'Invalid duration',
        description: 'Duration must be positive.',
        variant: 'destructive',
      });
      return;
    }
    if (!imageUrl.trim()) {
      toast({
        title: 'Image required',
        description: 'Please upload a service image.',
        variant: 'destructive',
      });
      return;
    }

    setSavingService(true);
    try {
      const endpoint = editingServiceId
        ? getApiUrl(`/api/v1/services/${encodeURIComponent(editingServiceId)}`)
        : getApiUrl('/api/v1/services');
      const method = editingServiceId ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          category,
          description: description.trim(),
          priceCents: Math.round(numericPrice * 100),
          durationMinutes: numericDuration,
          imageUrl: imageUrl.trim(),
          isActive,
        }),
      });

      if (handleAuthFailure(res.status)) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not save service.');

      toast({
        title: editingServiceId ? 'Service updated' : 'Service added',
        description: `${title.trim()} saved successfully.`,
        variant: 'success',
      });
      resetServiceForm();
      await loadAllAdminData(false);
      handleSelectTab('services');
    } catch (err) {
      toast({
        title: 'Save failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSavingService(false);
    }
  }

  async function handleToggleServiceActive(svc: Service) {
    try {
      const res = await fetch(getApiUrl(`/api/v1/services/${encodeURIComponent(svc._id)}`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !svc.isActive }),
      });

      if (handleAuthFailure(res.status)) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not update service status.');
      toast({
        title: !svc.isActive ? 'Service activated' : 'Service deactivated',
        variant: 'success',
      });
      await loadAllAdminData(false);
    } catch (err) {
      toast({
        title: 'Action failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  }

  async function handleDeleteService(id: string) {
    try {
      const res = await fetch(getApiUrl(`/api/v1/services/${encodeURIComponent(id)}`), {
        method: 'DELETE',
        credentials: 'include',
      });

      if (handleAuthFailure(res.status)) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not delete service.');
      toast({ title: 'Service deleted', variant: 'success' });
      if (editingServiceId === id) resetServiceForm();
      await loadAllAdminData(false);
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  }

  async function handleAppointmentDecision(id: string, status: 'Confirmed' | 'Cancelled') {
    try {
      const res = await fetch(getApiUrl(`/api/v1/appointments/${encodeURIComponent(id)}`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (handleAuthFailure(res.status)) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not update appointment.');
      toast({ title: `Appointment ${status}`, variant: 'success' });
      await loadAllAdminData(false);
    } catch (err) {
      toast({
        title: 'Update failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  }

  async function handleToggleUserBlock(target: User) {
    try {
      const res = await fetch(
        getApiUrl(`/api/v1/users/${encodeURIComponent(target._id)}/block`),
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isBlocked: !target.isBlocked }),
        }
      );

      if (handleAuthFailure(res.status)) return;

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not update user status.');
      toast({
        title: !target.isBlocked ? 'User blocked' : 'User unblocked',
        description: `${target.name}'s access has been updated.`,
        variant: 'success',
      });
      await loadAllAdminData(false);
    } catch (err) {
      toast({
        title: 'Action failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    }
  }

  const activeServicesCount = services.filter((s) => s.isActive).length;
  const pendingApptsCount = appointments.filter((a) => a.status === 'Pending').length;
  const confirmedApptsCount = appointments.filter((a) => a.status === 'Confirmed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage salon services, appointments, customers, payments, and your profile.
          </p>
        </div>

        {tab === 'services' && (
          <button
            type="button"
            onClick={openNewServiceTab}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            <span>Add/Update Service</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading admin dashboard...</span>
        </div>
      ) : tab === 'overview' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">Total Registered Customers</p>
            <p className="mt-1 text-2xl font-bold">{customers.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">Total Active Services</p>
            <p className="mt-1 text-2xl font-bold">{activeServicesCount}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">Total Appointment Requests</p>
            <p className="mt-1 text-2xl font-bold">{appointments.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">Pending Appointments</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{pendingApptsCount}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">Confirmed Appointments</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{confirmedApptsCount}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">Total Successful Payments</p>
            <p className="mt-1 text-2xl font-bold">{transactions.length}</p>
          </div>
        </div>
      ) : tab === 'services' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Manage Services ({services.length})</h2>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="p-3">Service</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc) => (
                  <tr key={svc._id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{svc.title}</td>
                    <td className="p-3">{svc.category}</td>
                    <td className="p-3">${(svc.priceCents / 100).toFixed(2)}</td>
                    <td className="p-3">{svc.durationMinutes} mins</td>
                    <td className="p-3">{svc.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditService(svc)}
                          className="rounded border px-2.5 py-1 text-xs hover:bg-accent"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleServiceActive(svc)}
                          className="rounded border px-2.5 py-1 text-xs hover:bg-accent"
                        >
                          {svc.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(svc._id)}
                          className="inline-flex items-center gap-1 rounded border border-destructive/50 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'add-service' ? (
        <form onSubmit={handleSaveService} className="space-y-4 rounded-xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editingServiceId ? 'Update Service' : 'Add New Service'}
            </h2>
            {editingServiceId && (
              <button
                type="button"
                onClick={resetServiceForm}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Switch to Add New
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Service Name</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">Service Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">
                Estimated Duration (in minutes)
              </label>
              <input
                type="number"
                min={1}
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Description</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium hover:bg-accent">
              <Upload className="h-4 w-4" />
              <span>{uploadingImg ? 'Uploading Image...' : 'Upload Service Image'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleServiceImageUpload}
                className="hidden"
              />
            </label>

            {imageUrl && (
              <Image
                src={imageUrl}
                alt="Service preview"
                width={48}
                height={48}
                unoptimized
                className="h-12 w-12 rounded border object-cover"
              />
            )}

            <div>
              <label className="mr-2 text-xs font-medium">Service Status:</label>
              <select
                value={isActive ? 'active' : 'inactive'}
                onChange={(e) => setIsActive(e.target.value === 'active')}
                className="rounded-md border bg-background px-2.5 py-1.5 text-xs"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={savingService || uploadingImg}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {savingService
                ? 'Saving...'
                : editingServiceId
                  ? 'Update Service'
                  : 'Create Service'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetServiceForm();
                handleSelectTab('services');
              }}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : tab === 'appointments' ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Service</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Requested</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
                  <tr key={appt._id} className="border-b last:border-0">
                    <td className="p-3">
                      <p className="font-medium">{appt.customerName}</p>
                      <p className="text-xs text-muted-foreground">{appt.customerEmail}</p>
                    </td>
                    <td className="p-3">{appt.serviceTitle}</td>
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
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedAppt(appt)}
                          className="rounded border px-2 py-1 text-xs hover:bg-accent"
                        >
                          Details
                        </button>
                        {appt.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => handleAppointmentDecision(appt._id, 'Confirmed')}
                            className="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
                          >
                            Confirm
                          </button>
                        )}
                        {(appt.status === 'Pending' || appt.status === 'Confirmed') && (
                          <button
                            type="button"
                            onClick={() => handleAppointmentDecision(appt._id, 'Cancelled')}
                            className="rounded border border-destructive/50 px-2 py-1 text-xs text-destructive"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

                <div className="flex items-center gap-4">
                  {selectedAppt.serviceImage ? (
                    <Image
                      src={selectedAppt.serviceImage}
                      alt={selectedAppt.serviceTitle}
                      width={64}
                      height={64}
                      unoptimized
                      className="h-16 w-16 rounded-lg border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/15 text-lg font-bold text-primary">
                      {selectedAppt.serviceTitle?.charAt(0).toUpperCase() || 'A'}
                    </div>
                  )}
                  <div>
                    <p className="text-base font-semibold">{selectedAppt.serviceTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedAppt.date} · {selectedAppt.startTime}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border bg-muted/30 p-3.5">
                  <p>
                    <strong>Customer:</strong> {selectedAppt.customerName} ({selectedAppt.customerEmail})
                  </p>
                  <p>
                    <strong>Price:</strong> ${(selectedAppt.servicePriceCents / 100).toFixed(2)}
                  </p>
                  <p>
                    <strong>Status:</strong> {selectedAppt.status}
                  </p>
                  <p>
                    <strong>Payment:</strong> {selectedAppt.paymentStatus}
                  </p>
                  <p>
                    <strong>Requested:</strong> {new Date(selectedAppt.createdAt).toLocaleString()}
                  </p>
                  <p>
                    <strong>Customer Message:</strong>{' '}
                    {selectedAppt.message || 'No additional message provided.'}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {selectedAppt.status === 'Pending' && (
                    <button
                      type="button"
                      onClick={() => handleAppointmentDecision(selectedAppt._id, 'Confirmed')}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      Confirm
                    </button>
                  )}
                  {(selectedAppt.status === 'Pending' || selectedAppt.status === 'Confirmed') && (
                    <button
                      type="button"
                      onClick={() => handleAppointmentDecision(selectedAppt._id, 'Cancelled')}
                      className="rounded-md border border-destructive/50 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedAppt(null)}
                    className="rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : tab === 'users' ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => (
                  <tr key={cust._id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{cust.name}</td>
                    <td className="p-3">{cust.email}</td>
                    <td className="p-3">{cust.isBlocked ? 'Blocked' : 'Active'}</td>
                    <td className="p-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer({ ...cust })}
                        className="rounded border px-2.5 py-1 text-xs hover:bg-accent"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleUserBlock(cust)}
                        className="rounded border px-2.5 py-1 text-xs hover:bg-accent"
                      >
                        {cust.isBlocked ? 'Unblock User' : 'Block User'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedCustomer && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setSelectedCustomer(null)}
            >
              <div
                className="w-full max-w-md space-y-4 rounded-xl border bg-card p-6 text-sm shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-base font-semibold">Customer Details</h3>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="rounded-md border px-2.5 py-1 text-xs hover:bg-accent"
                  >
                    Close
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  {selectedCustomer.avatarUrl ? (
                    <Image
                      src={selectedCustomer.avatarUrl}
                      alt={selectedCustomer.name}
                      width={64}
                      height={64}
                      unoptimized
                      className="h-16 w-16 rounded-full border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
                      {selectedCustomer.name?.charAt(0).toUpperCase() || 'C'}
                    </div>
                  )}
                  <div>
                    <p className="text-base font-semibold">{selectedCustomer.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedCustomer.email}</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border bg-muted/30 p-3.5">
                  <p>
                    <strong>Customer ID:</strong>{' '}
                    <span className="font-mono text-xs">{selectedCustomer._id}</span>
                  </p>
                  <p>
                    <strong>Phone:</strong> {selectedCustomer.phone || 'Not provided'}
                  </p>
                  <p>
                    <strong>Role:</strong> {selectedCustomer.role || 'client'}
                  </p>
                  <p>
                    <strong>Account Status:</strong>{' '}
                    <span
                      className={
                        selectedCustomer.isBlocked
                          ? 'font-semibold text-rose-600'
                          : 'font-semibold text-emerald-600'
                      }
                    >
                      {selectedCustomer.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleToggleUserBlock(selectedCustomer)}
                    className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                  >
                    {selectedCustomer.isBlocked ? 'Unblock User' : 'Block User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : tab === 'transactions' ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Service</th>
                <th className="p-3">Appointment Date</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Currency</th>
                <th className="p-3">Session Ref</th>
                <th className="p-3">Status</th>
                <th className="p-3">Transaction Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx._id} className="border-b last:border-0">
                  <td className="p-3">
                    <p className="font-medium">{tx.customerName}</p>
                    <p className="text-xs text-muted-foreground">{tx.customerEmail}</p>
                  </td>
                  <td className="p-3">{tx.serviceTitle}</td>
                  <td className="p-3">{tx.appointmentDate}</td>
                  <td className="p-3">${(tx.amountCents / 100).toFixed(2)}</td>
                  <td className="p-3">{tx.currency}</td>
                  <td className="p-3 font-mono text-xs">
                    {tx.stripeSessionId.slice(0, 18)}...
                  </td>
                  <td className="p-3 font-medium text-emerald-600">{tx.paymentStatus}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ProfileForm user={user} onUpdated={handleProfileUpdated} />
      )}
    </div>
  );
}