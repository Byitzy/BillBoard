'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getPossibleTransitions } from '@/lib/bills/status';
import { useBillOperations } from '@/hooks/useBillOperations';

interface Bill {
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
}

interface BillActionsProps {
  bill: Bill | null;
  onSaved: () => void;
}

export default function BillActions({ bill, onSaved }: BillActionsProps) {
  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-semibold mb-3 text-neutral-900 dark:text-neutral-100">
          Quick Actions
        </h2>
        {bill ? (
          <QuickActions bill={bill} onSaved={onSaved} />
        ) : (
          <div className="text-sm text-neutral-500">Loading…</div>
        )}
      </div>

      {/* Edit Schedule */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-semibold mb-3 text-neutral-900 dark:text-neutral-100">
          Edit Schedule
        </h2>
        {bill ? (
          <EditSchedule bill={bill} onSaved={onSaved} />
        ) : (
          <div className="text-sm text-neutral-500">Loading…</div>
        )}
      </div>
    </div>
  );
}

function QuickActions({ bill, onSaved }: { bill: Bill; onSaved: () => void }) {
  const isRecurring = !!bill.recurring_rule;

  // Use shared bill operations hook
  const {
    loading,
    billOccurrenceState,
    effectiveStatus,
    loadBillOccurrenceState,
    updateStatus,
    markAsPaid,
  } = useBillOperations(bill.id, bill.status, isRecurring, onSaved);

  const hasOccurrences = !!billOccurrenceState;
  const possibleTransitions = getPossibleTransitions(
    effectiveStatus,
    hasOccurrences
  );

  // Load bill occurrence state on mount
  useEffect(() => {
    loadBillOccurrenceState();
  }, [loadBillOccurrenceState]);

  return (
    <div className="space-y-3">
      {/* Dynamic status actions based on possible transitions */}
      {!isRecurring &&
        effectiveStatus !== 'paid' &&
        possibleTransitions.length > 0 && (
          <div className="space-y-2">
            {/* Submit for Approval */}
            {possibleTransitions.includes('pending_approval') && (
              <button
                onClick={() => updateStatus('pending_approval')}
                disabled={loading}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>📋</span>
                {loading ? 'Submitting...' : 'Submit for Approval'}
              </button>
            )}

            {/* Approve */}
            {possibleTransitions.includes('approved') && (
              <button
                onClick={() => updateStatus('approved')}
                disabled={loading}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>✅</span>
                {loading ? 'Approving...' : 'Approve Bill'}
              </button>
            )}

            {/* Mark as Paid */}
            {possibleTransitions.includes('paid') && (
              <button
                onClick={markAsPaid}
                disabled={loading}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>💳</span>
                {loading ? 'Marking as Paid...' : 'Mark as Paid'}
              </button>
            )}

            {/* Put on Hold */}
            {possibleTransitions.includes('on_hold') && (
              <button
                onClick={() => updateStatus('on_hold')}
                disabled={loading}
                className="w-full px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>⏸️</span>
                Put on Hold
              </button>
            )}

            {/* Cancel */}
            {possibleTransitions.includes('canceled') && (
              <button
                onClick={() => updateStatus('canceled')}
                disabled={loading}
                className="w-full px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>❌</span>
                Cancel Bill
              </button>
            )}
          </div>
        )}

      {/* For recurring bills, show helpful info */}
      {isRecurring && (
        <div className="text-sm text-neutral-600 dark:text-neutral-400 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span>🔄</span>
            <span className="font-medium">Recurring Bill</span>
          </div>
          <p>
            Individual occurrences can be managed in the occurrences list below.
            Use the schedule editor to modify the recurring pattern.
          </p>
        </div>
      )}

      {/* Paid status display */}
      {effectiveStatus === 'paid' && !isRecurring && (
        <div className="text-sm text-blue-600 dark:text-blue-400 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span>💳</span>
            <span className="font-medium">Bill Paid</span>
          </div>
          <p>
            This bill has been marked as paid and requires no further action.
          </p>
        </div>
      )}

      {/* Info for bills without occurrences */}
      {!hasOccurrences && !isRecurring && effectiveStatus !== 'paid' && (
        <div className="text-sm text-neutral-600 dark:text-neutral-400 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span>📄</span>
            <span className="font-medium">Simple Bill</span>
          </div>
          <p>
            This bill doesn&apos;t use occurrence tracking. Status changes
            update the bill directly.
          </p>
        </div>
      )}
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
