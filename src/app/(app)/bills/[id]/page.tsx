'use client';
import { useEffect, useState } from 'react';
import BillActions from '@/components/bills/BillActions';
import BillHeader from '@/components/bills/BillHeader';
import OccurrenceList from '@/components/bills/OccurrenceList';
import { getSupabaseClient } from '@/lib/supabase/client';

type Props = { params: { id: string } };

type Bill = {
  id: string;
  title: string;
  amount_total: number;
  currency?: string;
  due_date: string | null;
  recurring_rule?: any | null;
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

  async function load() {
    setLoading(true);
    setError(null);
    const { data: bills, error: be } = await supabase
      .from('bills')
      .select('id,title,amount_total,currency,due_date,recurring_rule')
      .eq('id', params.id)
      .limit(1);
    if (be) setError(be.message);
    setBill((bills?.[0] as any) ?? null);
    const { data: occurrences, error: oe } = await supabase
      .from('bill_occurrences')
      .select('id,sequence,amount_due,due_date,suggested_submission_date,state')
      .eq('bill_id', params.id)
      .order('sequence');
    if (oe) setError(oe.message);
    setOcc((occurrences ?? []) as Occ[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [params.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <BillHeader bill={bill} error={error} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-3">
          <OccurrenceList
            occurrences={occ}
            loading={loading}
            onRefresh={load}
          />

          <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-800 card-surface">
            Attachments
          </div>
          <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-800 card-surface">
            Comments
          </div>
        </div>

        <BillActions bill={bill} onSaved={load} />
      </div>
    </div>
  );
}
