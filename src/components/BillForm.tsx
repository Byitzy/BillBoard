"use client";
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';

type Props = { onCreated?: () => void };

type Option = { id: string; name: string };

export default function BillForm({ onCreated }: Props) {
  const supabase = getSupabaseClient();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('CAD');

  const [vendorQuery, setVendorQuery] = useState('');
  const [vendorOptions, setVendorOptions] = useState<Option[]>([]);
  const [vendor, setVendor] = useState<Option | null>(null);

  const [projectQuery, setProjectQuery] = useState('');
  const [projectOptions, setProjectOptions] = useState<Option[]>([]);
  const [project, setProject] = useState<Option | null>(null);

  const [isRecurring, setIsRecurring] = useState(false);
  const [dueDate, setDueDate] = useState(''); // for one-off
  const [startDate, setStartDate] = useState(''); // for recurring
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually'>('monthly');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'pending_approval' | 'approved' | 'on_hold' | 'active'>('active');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDefaultOrgId(supabase).then(setOrgId);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!orgId) return;
      if (!vendorQuery.trim()) {
        setVendorOptions([]);
        return;
      }
      const { data } = await supabase
        .from('vendors')
        .select('id,name')
        .eq('org_id', orgId)
        .ilike('name', `%${vendorQuery.trim()}%`)
        .limit(8);
      if (!cancelled) setVendorOptions((data ?? []) as Option[]);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [vendorQuery, orgId, supabase]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!orgId) return;
      if (!projectQuery.trim()) {
        setProjectOptions([]);
        return;
      }
      const { data } = await supabase
        .from('projects')
        .select('id,name')
        .eq('org_id', orgId)
        .ilike('name', `%${projectQuery.trim()}%`)
        .limit(8);
      if (!cancelled) setProjectOptions((data ?? []) as Option[]);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [projectQuery, orgId, supabase]);

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
    const existing = vendorOptions.find((v) => v.name.toLowerCase() === norm.toLowerCase());
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
    const existing = projectOptions.find((p) => p.name.toLowerCase() === norm.toLowerCase());
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
      let vendorId: string | null = vendor?.id ?? null;
      let projectId: string | null = project?.id ?? null;

      if (!vendorId && vendorQuery.trim()) {
        const v = await ensureVendor(vendorQuery);
        vendorId = v?.id ?? null;
      }
      if (!projectId && projectQuery.trim()) {
        const p = await ensureProject(projectQuery);
        projectId = p?.id ?? null;
      }

      const amt = parseFloat(amount);
      if (Number.isNaN(amt)) throw new Error('Please provide a valid amount.');

      const computedTitle = `${vendor?.name || vendorQuery || 'Bill'} ${currency} ${amt.toFixed(2)}`;
      const payload: any = {
        org_id: orgId,
        title: computedTitle,
        amount_total: amt,
        currency,
        vendor_id: vendorId,
        project_id: projectId,
        description: notes || null,
        status
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

      // Ask server to (re)generate occurrences for this bill
      if (inserted?.id) {
        const { data: sessionRes } = await supabase.auth.getSession();
        const access = sessionRes.session?.access_token;
        await fetch(`/api/bills/${inserted.id}/generate`, {
          method: 'POST',
          headers: access ? { Authorization: `Bearer ${access}` } : undefined
        });
      }

      // reset
      setAmount('');
      setCurrency('CAD');
      setVendor(null);
      setVendorQuery('');
      setProject(null);
      setProjectQuery('');
      setIsRecurring(false);
      setDueDate('');
      setStartDate('');
      setEndDate('');
      setFrequency('monthly');
      setNotes('');
      setStatus('active');
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
            className="flex-1 rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
            placeholder="Amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <select
            className="w-28 rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
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
        <select
          className="rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          title="Status"
        >
          {[
            { v: 'active', l: 'Active' },
            { v: 'pending_approval', l: 'Pending' },
            { v: 'approved', l: 'Approved' },
            { v: 'on_hold', l: 'On Hold' }
          ].map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Vendor combobox */}
        <div>
          <div className="text-xs text-neutral-500 mb-1">Vendor</div>
          <div className="relative">
            <input
              className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
              placeholder="Type to search or create vendor"
              value={vendor ? vendor.name : vendorQuery}
              onChange={(e) => {
                setVendor(null);
                setVendorQuery(e.target.value);
              }}
            />
            {vendor === null && vendorQuery && vendorOptions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                {vendorOptions.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => {
                        setVendor(v);
                        setVendorQuery('');
                      }}
                    >
                      {v.name}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    onClick={async () => {
                      const v = await ensureVendor(vendorQuery);
                      if (v) {
                        setVendor(v);
                        setVendorQuery('');
                      }
                    }}
                  >
                    Create “{vendorQuery}”
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>

        {/* Project combobox */}
        <div>
          <div className="text-xs text-neutral-500 mb-1">Project</div>
          <div className="relative">
            <input
              className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
              placeholder="Type to search or create project"
              value={project ? project.name : projectQuery}
              onChange={(e) => {
                setProject(null);
                setProjectQuery(e.target.value);
              }}
            />
            {project === null && projectQuery && projectOptions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                {projectOptions.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => {
                        setProject(p);
                        setProjectQuery('');
                      }}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    onClick={async () => {
                      const p = await ensureProject(projectQuery);
                      if (p) {
                        setProject(p);
                        setProjectQuery('');
                      }
                    }}
                  >
                    Create “{projectQuery}”
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Recurrence */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="flex items-center gap-2">
          <input id="recurring" type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
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
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
                placeholder="Due date"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div className="space-y-1">
              <label className="block text-xs text-neutral-500">Frequency</label>
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
            <div className="space-y-1">
              <label className="block text-xs text-neutral-500">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
                placeholder="Start date"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-neutral-500">End date (optional)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
                placeholder="End date (optional)"
              />
            </div>
          </div>
        )}
      </div>

      <textarea
        className="w-full rounded-xl border border-neutral-200 bg-transparent px-3 py-2 text-sm dark:border-neutral-800"
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
