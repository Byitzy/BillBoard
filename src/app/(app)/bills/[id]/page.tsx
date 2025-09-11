'use client';
import { useEffect, useState } from 'react';
import BillActions from '@/components/bills/BillActions';
import BillHeader from '@/components/bills/BillHeader';
import OccurrenceList from '@/components/bills/OccurrenceList';
import { getSupabaseClient } from '@/lib/supabase/client';

type Props = { params: Promise<{ id: string }> };

type Bill = {
  id: string;
  title: string;
  amount_total: number;
  currency?: string;
  due_date: string | null;
  recurring_rule?: any | null;
  status: string;
  description: string | null;
  category: string | null;
  vendor_name: string | null;
  project_name: string | null;
  created_at: string;
};

type Occ = {
  id: string;
  sequence: number;
  amount_due: number;
  due_date: string;
  suggested_submission_date: string | null;
  state: string;
};

export default function BillDetailPage({ params }: Props) {
  const supabase = getSupabaseClient();
  const [bill, setBill] = useState<Bill | null>(null);
  const [occ, setOcc] = useState<Occ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(
    null
  );

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  async function load() {
    if (!resolvedParams) return;

    setLoading(true);
    setError(null);
    const { data: bills, error: be } = await supabase
      .from('bills')
      .select(
        `
        id,
        title,
        amount_total,
        currency,
        due_date,
        recurring_rule,
        status,
        description,
        category,
        created_at,
        vendors(name),
        projects(name)
      `
      )
      .eq('id', resolvedParams.id)
      .limit(1);
    if (be) setError(be.message);
    const billData = bills?.[0] as any;
    if (billData) {
      setBill({
        id: billData.id,
        title: billData.title,
        amount_total: billData.amount_total,
        currency: billData.currency,
        due_date: billData.due_date,
        recurring_rule: billData.recurring_rule,
        status: billData.status,
        description: billData.description,
        category: billData.category,
        created_at: billData.created_at,
        vendor_name: billData.vendors?.name || null,
        project_name: billData.projects?.name || null,
      });
    } else {
      setBill(null);
    }
    const { data: occurrences, error: oe } = await supabase
      .from('bill_occurrences')
      .select('id,sequence,amount_due,due_date,suggested_submission_date,state')
      .eq('bill_id', resolvedParams.id)
      .order('sequence');
    if (oe) setError(oe.message);
    setOcc((occurrences ?? []) as Occ[]);
    setLoading(false);
  }

  useEffect(() => {
    if (resolvedParams) {
      load();
    }
  }, [resolvedParams]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <BillHeader bill={bill} error={error} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <OccurrenceList
            occurrences={occ}
            loading={loading}
            onRefresh={load}
          />

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Attachments
            </h3>
            <div className="text-center py-8">
              <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-neutral-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                  />
                </svg>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No attachments yet. Upload receipts, invoices, or supporting
                documents.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Comments & Notes
            </h3>
            <div className="text-center py-8">
              <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-neutral-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.691 1.327 3.06 2.963 3.06c.928 0 1.68-.574 1.884-1.384l.01-.044c.031-.142.043-.296.043-.453c0-.69-.56-1.25-1.25-1.25H1.5zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No comments yet. Add notes about this bill, approval reasons, or
                payment details.
              </p>
            </div>
          </div>
        </div>

        <BillActions bill={bill} onSaved={load} />
      </div>
    </div>
  );
}
