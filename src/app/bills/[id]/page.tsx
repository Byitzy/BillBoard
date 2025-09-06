"use client";
import { useEffect, useState } from 'react';
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
  }, [params.id]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{bill ? bill.title : 'Bill'}</h1>
        {bill && (
          <p className="text-sm text-neutral-500">
            Total {bill.currency ?? 'CAD'} ${bill.amount_total.toFixed(2)}{bill.due_date ? ` · Due ${bill.due_date}` : ''}
          </p>
        )}
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-3">
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Occurrences</h2>
            {loading ? (
              <div className="text-sm text-neutral-500">Loading...</div>
            ) : occ.length === 0 ? (
              <div className="text-sm text-neutral-500">No occurrences. Create or adjust the schedule to generate them.</div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {occ.map((o) => (
                  <OccurrenceEditor key={o.id} occ={o} onSaved={load} />
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-800 card-surface">Attachments</div>
          <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-800 card-surface">Comments</div>
        </div>
        <div className="space-y-3">
          <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-800 card-surface">
            <h2 className="text-sm font-semibold mb-2">Edit Schedule</h2>
            {bill ? <EditSchedule bill={bill} onSaved={load} /> : <div className="text-sm text-neutral-500">Loading…</div>}
          </div>
          <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-800 card-surface">Approval Panel</div>
        </div>
      </div>
    </div>
  );
}

function EditSchedule({ bill, onSaved }: { bill: Bill; onSaved: () => void }) {
  const supabase = getSupabaseClient();
  const [isRecurring, setIsRecurring] = useState(!!bill.recurring_rule);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'>(
    bill.recurring_rule?.frequency === 'weekly'
      ? 'weekly'
      : bill.recurring_rule?.frequency === 'yearly'
      ? 'annually'
      : 'monthly'
  );
  const [startDate, setStartDate] = useState(bill.recurring_rule?.start_date ?? bill.due_date ?? '');
  const [endDate, setEndDate] = useState(bill.recurring_rule?.end_date ?? '');
  const [dueDate, setDueDate] = useState(bill.due_date ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setErr(null);
        const update: any = {};
        if (!isRecurring) {
          update.due_date = dueDate || null;
          update.recurring_rule = null;
        } else {
          const rule: any = {};
          if (frequency === 'weekly' || frequency === 'biweekly') {
            rule.frequency = 'weekly';
            if (frequency === 'biweekly') rule.interval = 2;
          } else if (frequency === 'monthly' || frequency === 'quarterly') {
            rule.frequency = 'monthly';
            if (frequency === 'quarterly') rule.interval = 3;
          } else rule.frequency = 'yearly';
          rule.start_date = startDate || new Date().toISOString().slice(0, 10);
          if (endDate) rule.end_date = endDate;
          update.recurring_rule = rule;
          update.due_date = null;
        }
        const { error } = await supabase.from('bills').update(update).eq('id', bill.id);
        if (error) setErr(error.message);
        else {
          const { data: sessionRes } = await supabase.auth.getSession();
          const access = sessionRes.session?.access_token;
          await fetch(`/api/bills/${bill.id}/generate`, { method: 'POST', headers: access ? { Authorization: `Bearer ${access}` } : undefined });
          onSaved();
        }
        setSaving(false);
      }}
    >
      <div className="flex items-center gap-2">
        <input id="rec" type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
        <label htmlFor="rec" className="text-sm">
          Recurring
        </label>
      </div>
      {!isRecurring ? (
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Due date</label>
          <input
            type="date"
            className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Frequency</label>
            <select
              className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Start date</label>
            <input
              type="date"
              className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">End date (optional)</label>
            <input
              type="date"
              className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      )}
      {err && <div className="text-xs text-red-600">{err}</div>}
      <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save schedule'}
      </button>
    </form>
  );
}

function OccurrenceEditor({ occ, onSaved }: { occ: Occ; onSaved: () => void }) {
  const supabase = getSupabaseClient();
  const [editing, setEditing] = useState(false);
  const [amt, setAmt] = useState(String(occ.amount_due));
  const [due, setDue] = useState(occ.due_date);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border border-neutral-200 p-3 text-sm shadow-sm dark:border-neutral-800 card-surface">
      {!editing ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="font-medium">${occ.amount_due.toFixed(2)} · Due {occ.due_date}</div>
            <button className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900" onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>
          {occ.suggested_submission_date && <div className="text-amber-600 dark:text-amber-400">Submit by {occ.suggested_submission_date}</div>}
          <div className="text-xs text-neutral-500">State: {occ.state}</div>
        </div>
      ) : (
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setErr(null);
            const n = parseFloat(amt);
            if (Number.isNaN(n)) {
              setErr('Enter a valid amount');
              setSaving(false);
              return;
            }
            const { error } = await supabase
              .from('bill_occurrences')
              .update({ amount_due: n, due_date: due || occ.due_date, moved_from_date: occ.due_date })
              .eq('id', occ.id);
            if (error) setErr(error.message);
            else {
              onSaved();
              setEditing(false);
            }
            setSaving(false);
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              className="rounded-xl border border-neutral-200 bg-transparent px-2 py-1 text-sm dark:border-neutral-800"
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              inputMode="decimal"
            />
            <input
              type="date"
              className="rounded-xl border border-neutral-200 bg-transparent px-2 py-1 text-sm dark:border-neutral-800"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>
          {err && <div className="text-xs text-red-600">{err}</div>}
          <div className="flex items-center gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

