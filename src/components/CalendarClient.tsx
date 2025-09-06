"use client";
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';
import CalendarMonth from './CalendarMonth';

type Occ = { id: string; due_date: string; state: string; amount_due: number };

export default function CalendarClient() {
  const supabase = getSupabaseClient();
  const [date, setDate] = useState(new Date());
  const [occ, setOcc] = useState<Occ[]>([]);
  const [loading, setLoading] = useState(false);

  const ym = useMemo(() => ({ y: date.getFullYear(), m: date.getMonth() }), [date]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const orgId = await getDefaultOrgId(supabase);
      if (!orgId) {
        setOcc([]);
        setLoading(false);
        return;
      }
      const start = new Date(ym.y, ym.m, 1);
      const end = new Date(ym.y, ym.m + 1, 0);
      const startISO = start.toISOString().slice(0, 10);
      const endISO = end.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('bill_occurrences')
        .select('id,due_date,state,amount_due')
        .eq('org_id', orgId)
        .gte('due_date', startISO)
        .lte('due_date', endISO)
        .order('due_date');
      if (!cancelled) setOcc((data ?? []) as Occ[]);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [ym, supabase]);

  const byDay = useMemo(() => {
    const map = new Map<string, Occ[]>();
    for (const o of occ) {
      const k = o.due_date;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(o);
    }
    return map;
  }, [occ]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
          onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))}
        >
          Prev
        </button>
        <div className="text-sm text-neutral-500">
          {date.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </div>
        <button
          className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
          onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))}
        >
          Next
        </button>
      </div>
      <CalendarMonth
        date={date}
        renderDay={(d) => {
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const items = byDay.get(iso) ?? [];
          if (items.length === 0) return null;
          return (
            <div className="mt-1 space-y-1">
              {items.slice(0, 3).map((o) => (
                <div
                  key={o.id}
                  className="rounded-md px-2 py-1 text-xs"
                  style={{
                    backgroundColor: o.state === 'approved' ? 'rgba(34,197,94,0.15)' : o.state === 'on_hold' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                    color: 'hsl(var(--text))'
                  }}
                  title={`${o.state} · $${o.amount_due.toFixed(2)}`}
                >
                  ${o.amount_due.toFixed(0)} · {o.state}
                </div>
              ))}
              {items.length > 3 && <div className="text-[10px] text-neutral-500">+{items.length - 3} more…</div>}
            </div>
          );
        }}
      />
      {loading && <div className="text-sm text-neutral-500">Loading…</div>}
    </div>
  );
}

