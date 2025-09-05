"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const supabase = getSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    // On first load, supabase-js will parse the hash and set the session cookie
    supabase.auth.getSession().then(() => router.replace('/dashboard'));
  }, [router, supabase]);

  return <div className="text-sm text-neutral-500">Signing you in…</div>;
}

