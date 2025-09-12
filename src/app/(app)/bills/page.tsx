import ClientBillsPage from '@/components/ClientBillsPage';
import RequireOrg from '@/components/RequireOrg';
import { type BillRow } from '@/hooks/usePaginatedBills';
import { getDefaultOrgId } from '@/lib/org';
import { getServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// Disable caching for this page to ensure fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  const supabase = await getServerClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Let RequireOrg handle auth instead of blocking here
    if (!user) {
      console.log('Server: No user found, letting client handle auth', {
        authError: authError?.message,
      });
      // Pass empty data but let client-side auth guard handle it
      return (
        <RequireOrg>
          <ClientBillsPage
            initialBills={[]}
            initialNextDue={{}}
            initialError={null}
            initialFilterContext=""
            vendorOptions={[]}
            projectOptions={[]}
            debugInfo={{
              serverAuthIssue: 'No user on server',
              authError: authError?.message,
              note: 'Client will handle auth',
            }}
          />
        </RequireOrg>
      );
    }

    const orgId = await getDefaultOrgId(supabase);
    if (!orgId) {
      return (
        <RequireOrg>
          <ClientBillsPage
            initialBills={[]}
            initialNextDue={{}}
            initialError="No organization ID"
            initialFilterContext=""
            vendorOptions={[]}
            projectOptions={[]}
            debugInfo={{ error: 'No orgId', userId: user.id }}
          />
        </RequireOrg>
      );
    }

    // Simple query to test
    const { data, error } = await supabase
      .from('bills')
      .select(
        `
        id,
        title,
        amount_total,
        due_date,
        status,
        recurring_rule,
        created_at,
        currency,
        description,
        vendor_id,
        project_id,
        vendors(name),
        projects(name)
      `
      )
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    let bills = (data ?? []).map((row: any) => ({
      id: row.id,
      title: row.title,
      amount_total: row.amount_total,
      due_date: row.due_date,
      vendor_name: row.vendors?.name || null,
      project_name: row.projects?.name || null,
      vendor_id: row.vendor_id,
      project_id: row.project_id,
      status: row.status,
      recurring_rule: row.recurring_rule,
      created_at: row.created_at,
      currency: row.currency,
      description: row.description,
      category: null,
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

    const nextDue: Record<string, string | undefined> = {};

    console.log('DEBUG - After processing:', {
      billsCount: bills.length,
      firstBill: bills[0],
    });

    // Get only needed filter options - cached and limited
    const [vendorOptionsData, projectOptionsData] = await Promise.all([
      supabase
        .from('vendors')
        .select('id,name')
        .eq('org_id', orgId)
        .order('name')
        .limit(50), // Reduced limit
      supabase
        .from('projects')
        .select('id,name')
        .eq('org_id', orgId)
        .order('name')
        .limit(50), // Reduced limit
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
        (filterContext ? ' & ' : '') +
        `Search: "${resolvedSearchParams.search}"`;
    }

    // Pass debug info to client for troubleshooting
    const debugInfo = {
      queryDataCount: data?.length || 0,
      queryError: error?.message || null,
      orgId: orgId || 'MISSING',
      billsAfterProcessing: bills.length,
      hasUser: true,
      rawDataSample: data?.[0]
        ? { id: data[0].id, title: data[0].title }
        : null,
    };

    return (
      <RequireOrg>
        <ClientBillsPage
          initialBills={bills}
          initialNextDue={nextDue}
          initialError={error?.message || null}
          initialFilterContext={filterContext}
          vendorOptions={vendorOptions}
          projectOptions={projectOptions}
          debugInfo={debugInfo}
        />
      </RequireOrg>
    );
  } catch (err) {
    return (
      <RequireOrg>
        <ClientBillsPage
          initialBills={[]}
          initialNextDue={{}}
          initialError={`Server error: ${err}`}
          initialFilterContext=""
          vendorOptions={[]}
          projectOptions={[]}
          debugInfo={{ error: `Catch: ${err}` }}
        />
      </RequireOrg>
    );
  }
}
