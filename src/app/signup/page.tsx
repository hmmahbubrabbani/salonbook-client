'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Upload } from 'lucide-react';
import { signIn, signUp, authClient } from '@/lib/auth-client';
import { checkPasswordRules } from '@/lib/password';
import { toast } from '@/hooks/use-toast';

function getApiUrl(path: string){
  const base = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}

function SignUpContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard/client';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState('');

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const hasMinSix = password.length >= 6;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(getApiUrl('/api/v1/upload'), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.message || 'Could not upload profile image.');
      }

      setProfileImage(data.url);
      toast({
        title: 'Profile image uploaded',
        description: 'Your image URL has been attached.',
        variant: 'success',
      });
    } catch (err){
      const msg = (err as Error).message || 'Image upload failed.';
      setErrorMsg(msg);
      toast({ title: 'Upload failed', description: msg, variant: 'destructive' });
    } finally{
      setUploading(false);
    }
  }

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const ruleError = checkPasswordRules(password);
    if (ruleError){
      setErrorMsg(ruleError);
      toast({ title: 'Weak password', description: ruleError, variant: 'destructive' });
      return;
    }

    if (password !== confirmPassword) {
      const msg = 'Password and Confirm Password do not match.';
      setErrorMsg(msg);
      toast({ title: 'Password mismatch', description: msg, variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const cleanName = fullName.trim();
      const cleanEmail = email.trim().toLowerCase();
      const cleanAvatar = profileImage.trim();

      // 1) Register on salonbook-server (creates user & sets salonbook_token cookie)
      const apiRes = await fetch(getApiUrl('/api/v1/auth/register'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          avatarUrl: cleanAvatar,
        }),
      });
      const apiData = await apiRes.json().catch(() => ({}));

      if (!apiRes.ok || !apiData?.success || !apiData?.user) {
        const msg = apiData?.message || 'Sign up failed.';
        setErrorMsg(msg);
        toast({ title: 'Sign up failed', description: msg, variant: 'destructive' });
        return;
      }

      // 2) Keep Better Auth client session in sync
      const baSignUp = await signUp
        .email({
          name: cleanName,
          email: cleanEmail,
          password,
          image: cleanAvatar || undefined,
        })
        .catch(() => ({ error: { message: 'Sign up sync failed' } }));

      if (baSignUp?.error){
        await signIn.email({ email: cleanEmail, password }).catch(() => {});
      }

      setSuccessMsg('Account created successfully! Redirecting to your dashboard...');
      toast({
        title: 'Welcome to SalonBook',
        description: 'Your customer account is ready.',
        variant: 'success',
      });

      const target = callbackUrl.startsWith('/dashboard/admin')
        ? '/dashboard/client'
        : callbackUrl;
      window.location.assign(target);
    } catch (err) {
      const msg = (err as Error).message || 'Unable to complete sign up.';
      setErrorMsg(msg);
      toast({ title: 'Sign up error', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    if (submitting) return;

    setErrorMsg(null);
    setSubmitting(true);
    try {
      // Clear any leftover salonbook_token cookie from a previous account before OAuth
      await fetch(getApiUrl('/api/v1/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});

      const { error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: `/auth/callback?callbackUrl=${encodeURIComponent(callbackUrl)}`,
      });
      if (error) {
        const msg = error.message || 'Google authentication failed.';
        setErrorMsg(msg);
        toast({ title: 'Google Sign Up failed', description: msg, variant: 'destructive' });
        setSubmitting(false);
      }
    } catch (err) {
      const msg = (err as Error).message || 'Google authentication failed.';
      setErrorMsg(msg);
      toast({ title: 'Google Sign Up error', description: msg, variant: 'destructive' });
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sign Up for SalonBook</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a customer account to book salon appointments.
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

        <form onSubmit={handleEmailSignUp} autoComplete="off" className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium">Full Name</label>
            <input
              type="text"
              required
              disabled={submitting}
              placeholder="Samira Ahmed"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Email</label>
            <input
              type="email"
              required
              disabled={submitting}
              placeholder="samira@example.com"
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
                autoComplete="new-password"
                required
                disabled={submitting}
                placeholder="Enter password"
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
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li className={hasMinSix ? 'font-medium text-emerald-600' : ''}>
                - Minimum 6 characters
              </li>
              <li className={hasUpper ? 'font-medium text-emerald-600' : ''}>
                - At least one uppercase letter
              </li>
              <li className={hasLower ? 'font-medium text-emerald-600' : ''}>
                - At least one lowercase letter
              </li>
            </ul>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Confirm Password</label>
            <input
              type="password"
              autoComplete="new-password"
              required
              disabled={submitting}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
            />
            {confirmPassword.length > 0 && (
              <p
                className={`mt-1 text-xs ${
                  passwordsMatch ? 'font-medium text-emerald-600' : 'text-destructive'
                }`}
              >
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </p>
            )}
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
                  disabled={uploading || submitting}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <input
                type="url"
                disabled={submitting}
                placeholder="https://i.ibb.co/your-profile.jpg"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={submitting}
          className="w-full rounded-md border bg-background py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          Continue with Google
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading...</div>}>
      <SignUpContent />
    </Suspense>
  );
}