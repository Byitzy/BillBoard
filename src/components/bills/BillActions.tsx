'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

interface Bill {
  id: string;
  title: string;
  amount_total: number;
  currency?: string;
  due_date: string | null;
  recurring_rule?: any | null;
}

interface BillActionsProps {
  bill: Bill | null;
  onSaved: () => void;
}

export default function BillActions({ bill, onSaved }: BillActionsProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-800 card-surface">
        <h2 className="text-sm font-semibold mb-2">Edit Schedule</h2>
        {bill ? (
          <EditSchedule bill={bill} onSaved={onSaved} />
        ) : (
          <div className="text-sm text-neutral-500">Loading…</div>
        )}
      </div>
      <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-800 card-surface">
        Approval Panel
      </div>
    </div>
  );
}

function EditSchedule({ bill, onSaved }: { bill: Bill; onSaved: () => void }) {
  const supabase = getSupabaseClient();
  const [isRecurring, setIsRecurring] = useState(!!bill.recurring_rule);
  const [frequency, setFrequency] = useState<
    'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'
  >(
    bill.recurring_rule?.frequency === 'weekly'
      ? 'weekly'
      : bill.recurring_rule?.frequency === 'yearly'
        ? 'annually'
        : 'monthly'
  );
  const [startDate, setStartDate] = useState(
    bill.recurring_rule?.start_date ?? bill.due_date ?? ''
  );
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
        const { error } = await supabase
          .from('bills')
          .update(update)
          .eq('id', bill.id);
        if (error) setErr(error.message);
        else {
          const { data: sessionRes } = await supabase.auth.getSession();
          const access = sessionRes.session?.access_token;
          await fetch(`/api/bills/${bill.id}/generate`, {
            method: 'POST',
            headers: access ? { Authorization: `Bearer ${access}` } : undefined,
          });
          onSaved();
        }
        setSaving(false);
      }}
    >
      <div className="flex items-center gap-2">
        <input
          id="rec"
          type="checkbox"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
        />
        <label htmlFor="rec" className="text-sm">
          Recurring
        </label>
      </div>
      {!isRecurring ? (
        <div>
          <label className="block text-xs text-neutral-500 mb-1">
            Due date
          </label>
          <input
            type="date"
            className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              Frequency
            </label>
            <select
              className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
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
            <label className="block text-xs text-neutral-500 mb-1">
              Start date
            </label>
            <input
              type="date"
              className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">
              End date (optional)
            </label>
            <input
              type="date"
              className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      )}
      {err && <div className="text-xs text-red-600">{err}</div>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save schedule'}
      </button>
    </form>
  );
}
