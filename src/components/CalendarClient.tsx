"use client";
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';
import CalendarMonth from './CalendarMonth';
import { isQuebecBankHoliday, getQuebecBankHolidayName } from '@/lib/businessDays';
import { useLocale } from '@/components/i18n/LocaleProvider';

type Occ = { id: string; due_date: string; state: string; amount_due: number };

export default function CalendarClient() {
  const supabase = getSupabaseClient();
  const { t } = useLocale();
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
          {t('common.prev')}
        </button>
        <button
          className="rounded-xl border px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 bg-blue-600 text-white dark:bg-blue-600"
          onClick={() => {
            const today = new Date();
            setDate(new Date(today.getFullYear(), today.getMonth(), 1));
          }}
        >
          {t('common.today')}
        </button>
        <div className="text-sm text-neutral-500">
          {date.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
        </div>
        <button
          className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900"
          onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))}
        >
          {t('common.next')}
        </button>
      </div>
      <CalendarMonth
        date={date}
        getDayClass={(d) => {
          const holiday = getQuebecBankHolidayName(d);
          const day = d.getDay();
          const weekend = day === 0 || day === 6;
          return holiday ? 'border-amber-500' : weekend ? 'border-blue-400' : '';
        }}
        renderDay={(d) => {
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const items = byDay.get(iso) ?? [];
          const holiday = getQuebecBankHolidayName(d);
          
          return (
            <div className="group relative">
              {items.length > 0 && (
                <div className="mt-1 space-y-1">
                  {items.slice(0, 3).map((o) => (
                    <div
                      key={o.id}
                      className="rounded-md px-2 py-1 text-xs"
                      style={{
                        backgroundColor: o.state === 'approved' ? 'rgba(34,197,94,0.15)' : o.state === 'on_hold' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                        color: 'hsl(var(--text))'
                      }}
                    >
                      ${o.amount_due.toFixed(0)} · {o.state}
                    </div>
                  ))}
                  {items.length > 3 && <div className="text-[10px] text-neutral-500">+{items.length - 3} more…</div>}
                </div>
              )}
              
              {/* Info bubble on hover */}
              {(items.length > 0 || holiday) && (
                <div className="pointer-events-none absolute left-0 top-8 z-20 hidden w-56 rounded-xl border border-neutral-200 bg-[hsl(var(--surface))] p-3 text-xs shadow-xl group-hover:block dark:border-neutral-800">
                  {holiday && (
                    <div className="mb-2 rounded-lg bg-amber-100 px-2 py-1 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      <strong>Holiday:</strong> {holiday}
                    </div>
                  )}
                  {items.length > 0 && (
                    <>
                      <div className="mb-1 font-medium text-neutral-700 dark:text-neutral-200">
                        Bills Due ({items.length})
                      </div>
                      <div className="space-y-1">
                        {items.map((o) => (
                          <div key={o.id} className="flex justify-between">
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 mt-0.5 ${
                              o.state === 'approved' ? 'bg-green-500' : 
                              o.state === 'on_hold' ? 'bg-amber-500' : 
                              'bg-blue-500'
                            }`}></span>
                            <span className="flex-1">{o.state}</span>
                            <span className="font-medium">${o.amount_due.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="mt-2 pt-1 border-t border-neutral-200 dark:border-neutral-700 font-medium">
                          Total: ${items.reduce((sum, o) => sum + o.amount_due, 0).toFixed(2)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        }}
      />
      {loading && <div className="text-sm text-neutral-500">Loading…</div>}
    </div>
  );
}

