"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

interface RequireOrgProps {
  children: React.ReactNode;
}

export default function RequireOrg({ children }: RequireOrgProps) {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkAuthAndOrg() {
      try {
        // Check user authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }

        // Check org membership
        const { data: m } = await supabase
          .from('org_members')
          .select('org_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!m?.org_id) {
          router.replace('/onboarding');
          return;
        }

        setIsChecking(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/login');
      }
    }

    checkAuthAndOrg();
  }, [router, supabase]);

  if (isChecking) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}