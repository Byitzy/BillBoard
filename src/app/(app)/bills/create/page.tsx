import ClientCreateBillPage from '@/components/bills/ClientCreateBillPage';
import RequireOrg from '@/components/RequireOrg';
import { getDefaultOrgId } from '@/lib/org';
import { getServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Disable caching for this page to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CreateBillPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Let client guard handle auth - avoid SSR redirect loop
    return (
      <RequireOrg>
        <ClientCreateBillPage />
      </RequireOrg>
    );
  }

  const orgId = await getDefaultOrgId(supabase);
  if (!orgId) redirect('/onboarding');

  return (
    <RequireOrg>
      <ClientCreateBillPage />
    </RequireOrg>
  );
}
