"use client";
import Link from 'next/link';
import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';
import PDFExportButton from '@/components/PDFExportButton';
import CSVExportButton from '@/components/CSVExportButton';
import BillForm from '@/components/BillForm';
import FilterBar from '@/components/ui/FilterBar';
import { useLocale } from '@/components/i18n/LocaleProvider';

type BillRow = {
  id: string;
  title: string;
  amount_total: number;
  due_date: string | null;
  vendor_name: string | null;
  project_name: string | null;
};

type ClientBillsPageProps = {
  initialBills: BillRow[];
  initialNextDue: Record<string, string | undefined>;
  initialError: string | null;
  filterContext: string;
  vendorOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
};

export default function ClientBillsPage({ 
  initialBills, 
  initialNextDue, 
  initialError,
  filterContext,
  vendorOptions,
  projectOptions 
}: ClientBillsPageProps) {
  const supabase = getSupabaseClient();
  const { t } = useLocale();
  const [bills, setBills] = useState<BillRow[]>(initialBills);
  const [nextDue, setNextDue] = useState<Record<string, string | undefined>>(initialNextDue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function reload() {
    setLoading(true);
    setError(null);
    const orgId = await getDefaultOrgId(supabase);
    if (!orgId) {
      window.location.href = '/onboarding';
      return;
    }
    
    // Get current URL search params to maintain filters
    const urlParams = new URLSearchParams(window.location.search);
    
    let query = supabase
      .from('bills')
      .select(`
        id,
        title,
        amount_total,
        due_date,
        vendors(name),
        projects(name)
      `)
      .eq('org_id', orgId);

    // Apply same filters as server-side
    if (urlParams.get('vendorId')) {
      query = query.eq('vendor_id', urlParams.get('vendorId'));
    }
    if (urlParams.get('projectId')) {
      query = query.eq('project_id', urlParams.get('projectId'));
    }
    if (urlParams.get('status')) {
      query = query.eq('status', urlParams.get('status'));
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) setError(error.message);
    else {
      const rows = (data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        amount_total: row.amount_total,
        due_date: row.due_date,
        vendor_name: row.vendors?.name || null,
        project_name: row.projects?.name || null,
      })) as BillRow[];
      // Apply client-side search filter (same as server-side)
      let filteredRows = rows;
      if (urlParams.get('search')) {
        const searchLower = urlParams.get('search')!.toLowerCase();
        filteredRows = rows.filter(bill => 
          bill.title.toLowerCase().includes(searchLower) ||
          (bill.vendor_name && bill.vendor_name.toLowerCase().includes(searchLower)) ||
          (bill.project_name && bill.project_name.toLowerCase().includes(searchLower))
        );
      }
      
      setBills(filteredRows);
      
      // compute next due for recurring bills
      const ids = rows.filter((b) => !b.due_date).map((b) => b.id);
      if (ids.length > 0) {
        const today = new Date();
        const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const { data: occ } = await supabase
          .from('bill_occurrences')
          .select('bill_id,due_date')
          .in('bill_id', ids)
          .gte('due_date', iso)
          .order('due_date', { ascending: true });
        const map: Record<string, string> = {};
        occ?.forEach((o: any) => {
          if (!map[o.bill_id]) map[o.bill_id] = o.due_date;
        });
        setNextDue(map);
      } else {
        setNextDue({});
      }
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t('bills.title')}</h1>
          {filterContext && (
            <p className="text-sm text-neutral-500 mt-1">
              {filterContext} • <Link href="/bills" className="text-blue-600 hover:underline">Clear filter</Link>
            </p>
          )}
        </div>
        {bills.length > 0 && (
          <div className="flex items-center gap-2">
            <CSVExportButton
              type="data"
              data={bills.map(b => ({
                Vendor: b.vendor_name ?? '—',
                Project: b.project_name ?? '—',
                Amount: `$${b.amount_total.toFixed(2)}`,
                'Due Date': b.due_date ?? '—'
              }))}
              columns={['Vendor', 'Project', 'Amount', 'Due Date']}
              filename={`bills-list-${new Date().toISOString().slice(0, 10)}.csv`}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
            />
            <PDFExportButton
              type="data"
              data={bills.map(b => ({
                Vendor: b.vendor_name ?? '—',
                Project: b.project_name ?? '—',
                Amount: `$${b.amount_total.toFixed(2)}`,
                'Due Date': b.due_date ?? '—'
              }))}
              columns={['Vendor', 'Project', 'Amount', 'Due Date']}
              title="Bills List"
              filename={`bills-list-${new Date().toISOString().slice(0, 10)}.pdf`}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            />
          </div>
        )}
      </div>

      <BillForm onCreated={reload} />

      <FilterBar 
        searchPlaceholder="Search bills by title, vendor, or project..."
        vendorOptions={vendorOptions}
        projectOptions={projectOptions}
        statusOptions={[
          { value: 'active', label: 'Active' },
          { value: 'pending_approval', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'on_hold', label: 'On Hold' }
        ]}
        className="my-4"
      />

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 text-sm shadow-sm dark:border-neutral-800">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              {['Vendor', 'Project', 'Amount', 'Due', ''].map((h) => (
                <th key={h} className="px-3 py-2 text-neutral-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-2" colSpan={5}>
                  {t('common.loading')}
                </td>
              </tr>
            ) : bills.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={5}>
                  {filterContext ? 'No bills match the current filter.' : 'No bills yet.'}
                </td>
              </tr>
            ) : (
              bills.map((b) => (
                <tr key={b.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-3 py-2">{b.vendor_name || '—'}</td>
                  <td className="px-3 py-2">{b.project_name || '—'}</td>
                  <td className="px-3 py-2">${b.amount_total.toFixed(2)}</td>
                  <td className="px-3 py-2">{b.due_date ?? nextDue[b.id] ?? '—'}</td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/bills/${b.id}`} className="rounded-lg border px-2 py-1 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}