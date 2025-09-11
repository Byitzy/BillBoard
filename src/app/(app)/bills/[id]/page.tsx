'use client';
import { useEffect, useState } from 'react';
import BillActions from '@/components/bills/BillActions';
import BillHeader from '@/components/bills/BillHeader';
import OccurrenceList from '@/components/bills/OccurrenceList';
import BillAttachments from '@/components/bills/BillAttachments';
import BillComments from '@/components/bills/BillComments';
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
            <BillAttachments billId={resolvedParams?.id || ''} />
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-6">
            <BillComments billId={resolvedParams?.id || ''} />
          </div>
        </div>

        <BillActions bill={bill} onSaved={load} />
      </div>
    </div>
  );
}
