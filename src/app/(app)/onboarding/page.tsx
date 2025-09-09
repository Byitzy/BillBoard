'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function OnboardingPage() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Include Supabase session token so API can authenticate if cookies are not available
      const { getSupabaseClient } = await import('@/lib/supabase/client');
      const supabase = getSupabaseClient();
      const { data: sessionRes } = await supabase.auth.getSession();
      const access = sessionRes.session?.access_token;
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: access
          ? {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${access}`,
            }
          : { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug: slug || undefined }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || 'Failed to create organization');
      router.push('/');
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Create your organization</h1>
        <p className="text-sm text-neutral-500">
          You’ll be added as an admin; invite teammates next.
        </p>
      </div>
      <form onSubmit={createOrg} className="space-y-3">
        <input
          placeholder="Organization name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
          required
        />
        <input
          placeholder="Slug (optional)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create organization'}
        </button>
      </form>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
