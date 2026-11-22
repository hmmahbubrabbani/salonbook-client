'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { User } from '@/types/salonbook';

interface ProfileFormProps {
  user: User;
  onUpdated: (updated: User) => void;
}

function getApiUrl(path: string) {
  const base = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}

export function ProfileForm({ user, onUpdated }: ProfileFormProps) {
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user.name || '');
    setPhone(user.phone || '');
    setAvatarUrl(user.avatarUrl || '');
  }, [user]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);

      const res = await fetch(getApiUrl('/api/v1/upload'), {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });

      if (res.status === 401 || res.status === 403) {
        window.location.replace('/login?callbackUrl=%2Fdashboard%2Fclient%3Ftab%3Dprofile');
        return;
      }

      const data = await res.json().catch(() => ({}));
      const uploadedUrl =
        data?.url ||
        data?.avatarUrl ||
        data?.imageUrl ||
        data?.data?.display_url ||
        data?.data?.url ||
        '';

      if (!res.ok || !uploadedUrl) {
        throw new Error(data?.message || 'Image upload failed.');
      }

      const nextUrl = String(uploadedUrl).trim();
      setAvatarUrl(nextUrl);
      toast({
        title: 'Image uploaded',
        description: 'Click "Save Profile" to save changes.',
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedAvatar = avatarUrl.trim();

    if (!trimmedName) {
      toast({
        title: 'Name required',
        description: 'Please enter your full name.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/profile'), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone,
          avatarUrl: trimmedAvatar,
        }),
      });

      if (res.status === 401 || res.status === 403) {
        window.location.replace('/login?callbackUrl=%2Fdashboard%2Fclient%3Ftab%3Dprofile');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.user) {
        throw new Error(data?.message || 'Profile update failed.');
      }

      const updatedUser: User = {
        ...user,
        ...data.user,
        _id: String(data.user._id || user._id),
        name: String(data.user.name ?? trimmedName),
        phone: String(data.user.phone ?? trimmedPhone),
        avatarUrl: String(data.user.avatarUrl ?? trimmedAvatar),
      };

      setName(updatedUser.name);
      setPhone(updatedUser.phone || '');
      setAvatarUrl(updatedUser.avatarUrl || '');
      onUpdated(updatedUser);

      toast({
        title: 'Profile updated',
        description: 'Your changes have been saved.',
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Update failed',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border bg-card p-6">
      <h2 className="text-lg font-semibold">My Profile</h2>

      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name || 'User avatar'}
            width={56}
            height={56}
            unoptimized
            className="h-14 w-14 rounded-full border object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-muted text-sm font-semibold">
            {(name || user.email || 'U').slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{user.email}</p>
          <p className="capitalize">Role: {user.role}</p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">Full Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium">Phone Number</label>
        <input
          type="tel"
          placeholder="+880 1700-000000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium">Profile Image (Upload or Image URL)</label>
        <div className="flex items-center gap-2">
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-xs hover:bg-accent">
            <Upload className="h-3.5 w-3.5" />
            <span>{uploading ? 'Uploading...' : 'Upload'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading || saving}
              className="hidden"
            />
          </label>
          <input
            type="text"
            placeholder="https://i.ibb.co/... or /uploads/..."
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving || uploading}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        <span>{saving ? 'Saving...' : 'Save Profile'}</span>
      </button>
    </form>
  );
}