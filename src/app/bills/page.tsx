"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';
import PDFExportButton from '@/components/PDFExportButton';
import CSVExportButton from '@/components/CSVExportButton';
import BillForm from '@/components/BillForm';
import { useLocale } from '@/components/i18n/LocaleProvider';

type BillRow = {
  id: string;
  title: string;
  amount_total: number;
  due_date: string | null;
  vendor_name: string | null;
  project_name: string | null;
};

export default function BillsPage() {
  const supabase = getSupabaseClient();
  const { t } = useLocale();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [nextDue, setNextDue] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  async function load() {
    setLoading(true);
    setError(null);
    const id = await getDefaultOrgId(supabase);
    setOrgId(id);
    if (!id) {
      // Redirect to onboarding if no org
      window.location.href = '/onboarding';
      return;
    }
    const { data, error } = await supabase
      .from('bills')
      .select(`
        id,
        title,
        amount_total,
        due_date,
        vendors(name),
        projects(name)
      `)
      .eq('org_id', id)
      .order('created_at', { ascending: false });
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
      setBills(rows);
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


  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('bills.title')}</h1>
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

      <BillForm onCreated={load} />

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
                  No bills yet.
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
