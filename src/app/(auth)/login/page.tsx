'use client';
import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = getSupabaseClient();
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : undefined;

  async function signInMagic(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    setLoading(false);
    if (error) setStatus(error.message);
    else setStatus('Check your email for a login link.');
  }

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) setStatus(error.message);
    else window.location.href = '/dashboard';
  }

  // Removed signUpPassword - public registration is disabled

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <div className="flex gap-2">
        {[
          { key: 'magic', label: 'Magic Link' },
          { key: 'password', label: 'Email & Password' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setMode(t.key as 'magic' | 'password')}
            className={`rounded-xl border px-3 py-2 text-sm ${
              mode === t.key
                ? 'bg-[hsl(var(--surface))] ring-2 ring-[hsl(var(--accent))]'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-900'
            }`}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === 'magic' ? (
        <form onSubmit={signInMagic} className="space-y-3">
          <div>
            <label
              htmlFor="magic-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email Address
            </label>
            <input
              id="magic-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
              aria-describedby="magic-email-help"
            />
            <div id="magic-email-help" className="sr-only">
              Enter your email address to receive a magic link for signing in
            </div>
          </div>
          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            aria-describedby={loading ? 'loading-status' : undefined}
          >
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
          {loading && (
            <div id="loading-status" className="sr-only" aria-live="polite">
              Sending magic link to your email address
            </div>
          )}
        </form>
      ) : (
        <form className="space-y-3" onSubmit={signInPassword}>
          <div>
            <label
              htmlFor="password-email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email Address
            </label>
            <input
              id="password-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
            />
          </div>
          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            aria-describedby={loading ? 'loading-status' : undefined}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          {loading && (
            <div id="loading-status" className="sr-only" aria-live="polite">
              Signing in with email and password
            </div>
          )}
          <p className="text-xs text-neutral-500 mt-2">
            New users must be invited by an administrator.
          </p>
        </form>
      )}
      {status && (
        <div className="text-sm text-neutral-600 dark:text-neutral-300">
          {status}
        </div>
      )}
    </div>
  );
}
