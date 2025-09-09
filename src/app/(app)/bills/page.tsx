import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ClientBillsPage from '@/components/ClientBillsPage';
import RequireOrg from '@/components/RequireOrg';
import { getDefaultOrgId } from '@/lib/org';

type BillRow = {
  id: string;
  title: string;
  amount_total: number;
  due_date: string | null;
  vendor_name: string | null;
  project_name: string | null;
};

type BillsPageProps = {
  searchParams: Promise<{
    vendorId?: string;
    projectId?: string;
    search?: string;
    status?: string;
  }>;
};

export default async function BillsPage({ searchParams }: BillsPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log('SSR Bills user:', user?.id);
  if (!user) {
    // Let client guard handle auth - avoid SSR redirect loop
    return (
      <RequireOrg>
        <ClientBillsPage
          initialBills={[]}
          initialNextDue={{}}
          initialError={null}
          filterContext=""
          vendorOptions={[]}
          projectOptions={[]}
        />
      </RequireOrg>
    );
  }

  const orgId = await getDefaultOrgId(supabase);
  if (!orgId) redirect('/onboarding');

  // Build the query with optional filters
  let query = supabase
    .from('bills')
    .select(
      `
      id,
      title,
      amount_total,
      due_date,
      vendors(name),
      projects(name)
    `
    )
    .eq('org_id', orgId);

  // Apply filters based on search params
  if (resolvedSearchParams.vendorId) {
    query = query.eq('vendor_id', resolvedSearchParams.vendorId);
  }
  if (resolvedSearchParams.projectId) {
    query = query.eq('project_id', resolvedSearchParams.projectId);
  }
  // Apply status filter - default to 'active' if no status specified
  const status = resolvedSearchParams.status || 'active';
  query = query.eq('status', status);

  const { data, error } = await query.order('created_at', { ascending: false });

  let bills = (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    amount_total: row.amount_total,
    due_date: row.due_date,
    vendor_name: row.vendors?.name || null,
    project_name: row.projects?.name || null,
  })) as BillRow[];

  // Apply client-side search filter (since we need to search across multiple fields)
  if (resolvedSearchParams.search) {
    const searchLower = resolvedSearchParams.search.toLowerCase();
    bills = bills.filter(
      (bill) =>
        bill.title.toLowerCase().includes(searchLower) ||
        (bill.vendor_name &&
          bill.vendor_name.toLowerCase().includes(searchLower)) ||
        (bill.project_name &&
          bill.project_name.toLowerCase().includes(searchLower))
    );
  }

  // Get next due dates for recurring bills
  const recurringBills = bills.filter((b) => !b.due_date);
  let nextDue: Record<string, string | undefined> = {};

  if (recurringBills.length > 0) {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const { data: occ } = await supabase
      .from('bill_occurrences')
      .select('bill_id,due_date')
      .in(
        'bill_id',
        recurringBills.map((b) => b.id)
      )
      .gte('due_date', iso)
      .order('due_date', { ascending: true });

    const map: Record<string, string> = {};
    occ?.forEach((o: any) => {
      if (!map[o.bill_id]) map[o.bill_id] = o.due_date;
    });
    nextDue = map;
  }

  // Get filter options for FilterBar
  const [vendorOptionsData, projectOptionsData] = await Promise.all([
    supabase
      .from('vendors')
      .select('id,name')
      .eq('org_id', orgId)
      .order('name')
      .limit(100),
    supabase
      .from('projects')
      .select('id,name')
      .eq('org_id', orgId)
      .order('name')
      .limit(100),
  ]);

  const vendorOptions = vendorOptionsData.data ?? [];
  const projectOptions = projectOptionsData.data ?? [];

  // Get filter context for display
  let filterContext = '';
  if (resolvedSearchParams.vendorId) {
    const vendor = vendorOptions.find(
      (v) => v.id === resolvedSearchParams.vendorId
    );
    if (vendor) filterContext = `Filtered by vendor: ${vendor.name}`;
  }
  if (resolvedSearchParams.projectId) {
    const project = projectOptions.find(
      (p) => p.id === resolvedSearchParams.projectId
    );
    if (project) filterContext = `Filtered by project: ${project.name}`;
  }
  if (resolvedSearchParams.status) {
    filterContext +=
      (filterContext ? ' & ' : '') + `Status: ${resolvedSearchParams.status}`;
  }
  if (resolvedSearchParams.search) {
    filterContext +=
      (filterContext ? ' & ' : '') + `Search: "${resolvedSearchParams.search}"`;
  }

  return (
    <RequireOrg>
      <ClientBillsPage
        initialBills={bills}
        initialNextDue={nextDue}
        initialError={error?.message || null}
        filterContext={filterContext}
        vendorOptions={vendorOptions}
        projectOptions={projectOptions}
      />
    </RequireOrg>
  );
}
