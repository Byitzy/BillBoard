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

      // Handle bill occurrences - use generate API for both recurring and one-time bills
      if (inserted?.id) {
        const { data: sessionRes } = await supabase.auth.getSession();
        const access = sessionRes.session?.access_token;

        const response = await fetch(`/api/bills/${inserted.id}/generate`, {
          method: 'POST',
          headers: access ? { Authorization: `Bearer ${access}` } : undefined,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || 'Failed to generate bill occurrences'
          );
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
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Amount and Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Amount & Currency
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                name="amount"
                type="number"
                step="0.01"
                className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-3 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="0.00"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <select
              className="w-20 rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-3 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
        </div>
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Initial Status
          </label>
          <SharedSelect
            simple
            simpleValue={status}
            onSimpleChange={(value) => setStatus(value as any)}
            simpleOptions={[
              { value: 'active', label: 'Active' },
              { value: 'pending_approval', label: 'Pending Approval' },
              { value: 'approved', label: 'Approved' },
              { value: 'on_hold', label: 'On Hold' },
            ]}
          />
        </div>
      </div>

      {/* Vendor and Project Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vendor combobox */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Vendor
          </label>
          <SharedSelect
            value={vendor}
            onChange={setVendor}
            options={vendorOptions}
            placeholder="Search or create vendor..."
            allowCreate
            onCreate={ensureVendor}
          />
        </div>

        {/* Project combobox */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Project (Optional)
          </label>
          <SharedSelect
            value={project}
            onChange={setProject}
            options={projectOptions}
            placeholder="Search or create project..."
            allowCreate
            onCreate={ensureProject}
          />
        </div>
      </div>

      {/* Bill Type and Scheduling */}
      <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3 mb-4">
          <input
            id="recurring"
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-white border-neutral-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label
            htmlFor="recurring"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Make this a recurring bill
          </label>
        </div>
        {!isRecurring ? (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              One-time Bill
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Recurring Bill Settings
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Frequency
                </label>
                <select
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
                <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Auto-approve option for recurring bills */}
        {isRecurring && (
          <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <input
                id="autoApprove"
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-white border-neutral-300 rounded focus:ring-purple-500 focus:ring-2"
              />
              <div>
                <label
                  htmlFor="autoApprove"
                  className="text-sm font-medium text-purple-700 dark:text-purple-300"
                >
                  Auto-approve when due
                </label>
                <div className="text-xs text-purple-600 dark:text-purple-400">
                  Skip manual approval process for routine bills
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
          Notes & Description
        </label>
        <textarea
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 px-4 py-3 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          placeholder="Add any additional notes, descriptions, or details about this bill..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          {isRecurring
            ? 'This will create a recurring bill schedule'
            : 'This will create a one-time bill'}
        </div>
        <button
          type="submit"
          disabled={loading || !amount.trim()}
          className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving Bill...
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Create {isRecurring ? 'Recurring' : ''} Bill
            </>
          )}
        </button>
      </div>
    </form>
  );
}
