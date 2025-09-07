"use client";
import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = getSupabaseClient();
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;

  async function signInMagic(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true }
    });
    setLoading(false);
    if (error) setStatus(error.message);
    else setStatus('Check your email for a login link.');
  }

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setStatus(error.message);
    else window.location.href = '/dashboard';
  }

  async function signUpPassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
    setLoading(false);
    if (error) setStatus(error.message);
    else setStatus('Check your email to confirm your account.');
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <div className="flex gap-2">
        {[
          { key: 'magic', label: 'Magic Link' },
          { key: 'password', label: 'Email & Password' }
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setMode(t.key as 'magic' | 'password')}
            className={`rounded-xl border px-3 py-2 text-sm ${
              mode === t.key ? 'bg-[hsl(var(--surface))] ring-2 ring-[hsl(var(--accent))]' : 'hover:bg-neutral-100 dark:hover:bg-neutral-900'
            }`}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === 'magic' ? (
        <form onSubmit={signInMagic} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
          />
          <button disabled={loading} type="submit" className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={signInPassword}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
          />
          <div className="flex gap-2">
            <button disabled={loading} type="submit" className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <button disabled={loading} type="button" onClick={signUpPassword} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900">
              Create account
            </button>
          </div>
        </form>
      )}
      {status && <div className="text-sm text-neutral-600 dark:text-neutral-300">{status}</div>}
    </div>
  );
}
