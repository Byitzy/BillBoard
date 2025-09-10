'use client';
import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import SharedSelect, { SelectOption } from '@/components/ui/SharedSelect';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';

type Props = { onCreated?: () => void };

type Option = { id: string; name: string };

export default function BillForm({ onCreated }: Props) {
  const supabase = getSupabaseClient();
  const { t } = useLocale();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('CAD');

  const [vendorOptions, setVendorOptions] = useState<Option[]>([]);
  const [vendor, setVendor] = useState<Option | null>(null);

  const [projectOptions, setProjectOptions] = useState<Option[]>([]);
  const [project, setProject] = useState<Option | null>(null);

  const [isRecurring, setIsRecurring] = useState(false);
  const [dueDate, setDueDate] = useState(''); // for one-off
  const [startDate, setStartDate] = useState(''); // for recurring
  const [frequency, setFrequency] = useState<
    'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'
  >('monthly');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<
    'pending_approval' | 'approved' | 'on_hold' | 'active'
  >('active');
  const [autoApprove, setAutoApprove] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDefaultOrgId(supabase).then(setOrgId);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!orgId) return;
      const { data } = await supabase
        .from('vendors')
        .select('id,name')
        .eq('org_id', orgId)
        .order('name')
        .limit(50);
      if (!cancelled) setVendorOptions((data ?? []) as Option[]);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [orgId, supabase]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!orgId) return;
      const { data } = await supabase
        .from('projects')
        .select('id,name')
        .eq('org_id', orgId)
        .order('name')
        .limit(50);
      if (!cancelled) setProjectOptions((data ?? []) as Option[]);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [orgId, supabase]);

  const interval = useMemo(() => {
    switch (frequency) {
      case 'biweekly':
        return 2; // weekly*2
      case 'quarterly':
        return 3; // monthly*3
      default:
        return 1;
    }
  }, [frequency]);

  async function ensureVendor(name: string): Promise<Option | null> {
    if (!orgId) return null;
    const norm = name.trim();
    if (!norm) return null;
    const existing = vendorOptions.find(
      (v) => v.name.toLowerCase() === norm.toLowerCase()
    );
    if (existing) return existing;
    const { data: exists } = await supabase
      .from('vendors')
      .select('id,name')
      .eq('org_id', orgId)
      .ilike('name', norm)
      .limit(1);
    if (exists && exists.length > 0) return exists[0] as Option;
    const { data, error } = await supabase
      .from('vendors')
      .insert({ org_id: orgId, name: norm })
      .select('id,name')
      .single();
    if (error) {
      setError(error.message);
      return null;
    }
    return data as Option;
  }

  async function ensureProject(name: string): Promise<Option | null> {
    if (!orgId) return null;
    const norm = name.trim();
    if (!norm) return null;
    const existing = projectOptions.find(
      (p) => p.name.toLowerCase() === norm.toLowerCase()
    );
    if (existing) return existing;
    const { data: exists } = await supabase
      .from('projects')
      .select('id,name')
      .eq('org_id', orgId)
      .ilike('name', norm)
      .limit(1);
    if (exists && exists.length > 0) return exists[0] as Option;
    const { data, error } = await supabase
      .from('projects')
      .insert({ org_id: orgId, name: norm })
      .select('id,name')
      .single();
    if (error) {
      setError(error.message);
      return null;
    }
    return data as Option;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const vendorId: string | null = vendor?.id ?? null;
      const projectId: string | null = project?.id ?? null;

      const amt = parseFloat(amount);
      if (Number.isNaN(amt)) throw new Error('Please provide a valid amount.');

      const computedTitle = `${vendor?.name || 'Bill'} ${currency} ${amt.toFixed(2)}`;
      const payload: any = {
        org_id: orgId,
        title: computedTitle,
        amount_total: amt,
        currency,
        vendor_id: vendorId,
        project_id: projectId,
        description: notes || null,
        status,
        auto_approve: isRecurring ? autoApprove : false, // Only recurring bills can use auto_approve
      };

      if (!isRecurring) {
        payload.due_date = dueDate || null;
        payload.recurring_rule = null;
      } else {
        const rule: any = {};
        if (frequency === 'weekly' || frequency === 'biweekly') {
          rule.frequency = 'weekly';
          if (interval > 1) rule.interval = interval;
        } else if (frequency === 'monthly' || frequency === 'quarterly') {
          rule.frequency = 'monthly';
          if (interval > 1) rule.interval = interval;
        } else if (frequency === 'annually') {
          rule.frequency = 'yearly';
        }
        // set start date to provided startDate or today
        const start = startDate || new Date().toISOString().slice(0, 10);
        rule.start_date = start;
        if (endDate) rule.end_date = endDate;
        payload.recurring_rule = rule;
        payload.due_date = null;
      }

      const { data: inserted, error } = await supabase
        .from('bills')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;

      // Handle bill occurrences based on type
      if (inserted?.id) {
        if (isRecurring) {
          // For recurring bills: use the generate API to create scheduled occurrences
          const { data: sessionRes } = await supabase.auth.getSession();
          const access = sessionRes.session?.access_token;
          await fetch(`/api/bills/${inserted.id}/generate`, {
            method: 'POST',
            headers: access ? { Authorization: `Bearer ${access}` } : undefined,
          });
        } else {
          // For one-time bills: create occurrence directly in final state
          const finalState = status === 'active' ? 'pending_approval' : status;
          const occurrencePayload = {
            org_id: orgId,
            bill_id: inserted.id,
            project_id: projectId,
            vendor_id: vendorId,
            sequence: 1,
            amount_due: amt,
            due_date: dueDate || new Date().toISOString().split('T')[0],
            state: finalState,
          };

          const { error: occError } = await supabase
            .from('bill_occurrences')
            .insert(occurrencePayload);
          if (occError) throw occError;
        }
      }

      // reset
      setAmount('');
      setCurrency('CAD');
      setVendor(null);
      setProject(null);
      setIsRecurring(false);
      setDueDate('');
      setStartDate('');
      setEndDate('');
      setFrequency('monthly');
      setNotes('');
      setStatus('active');
      setAutoApprove(false);
      onCreated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to save bill');
    } finally {
      setLoading(false);
    }
  }

  const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP'];

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex gap-2">
          <input
            name="amount"
            type="number"
            step="0.01"
            className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
            placeholder="Amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <select
            className="w-28 rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <SharedSelect
          simple
          simpleValue={status}
          onSimpleChange={(value) => setStatus(value as any)}
          simpleOptions={[
            { value: 'active', label: 'Active' },
            { value: 'pending_approval', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'on_hold', label: 'On Hold' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Vendor combobox */}
        <div>
          <div className="text-xs text-neutral-500 mb-1">Vendor</div>
          <SharedSelect
            value={vendor}
            onChange={setVendor}
            options={vendorOptions}
            placeholder="Type to search or create vendor"
            allowCreate
            onCreate={ensureVendor}
          />
        </div>

        {/* Project combobox */}
        <div>
          <div className="text-xs text-neutral-500 mb-1">Project</div>
          <SharedSelect
            value={project}
            onChange={setProject}
            options={projectOptions}
            placeholder="Type to search or create project"
            allowCreate
            onCreate={ensureProject}
          />
        </div>
      </div>

      {/* Recurrence */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="flex items-center gap-2">
          <input
            id="recurring"
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
          />
          <label htmlFor="recurring" className="text-sm">
            Recurring
          </label>
        </div>
        {!isRecurring ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div className="space-y-1 md:col-span-1">
              <label className="block text-xs text-neutral-500">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
                placeholder="Due date"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div className="space-y-1">
              <label className="block text-xs text-neutral-500">
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
            <div className="space-y-1">
              <label className="block text-xs text-neutral-500">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
                placeholder="Start date"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-neutral-500">
                End date (optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
                placeholder="End date (optional)"
              />
            </div>
          </div>
        )}

        {/* Auto-approve option for recurring bills */}
        {isRecurring && (
          <div className="flex items-center gap-2">
            <input
              id="autoApprove"
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
            />
            <label htmlFor="autoApprove" className="text-sm">
              Auto-approve when due
            </label>
            <div className="text-xs text-neutral-500 ml-1">
              (Skip manual approval process)
            </div>
          </div>
        )}
      </div>

      <textarea
        className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
      />

      {error && <div className="text-sm text-red-600">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save Bill'}
      </button>
    </form>
  );
}
