'use client';
import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import {
  isQuebecBankHoliday,
  getQuebecBankHolidayName,
} from '@/lib/businessDays';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';
import CalendarMonth from './CalendarMonth';
import CalendarDayModal from './CalendarDayModal';

type Occ = {
  id: string;
  due_date: string;
  state: string;
  amount_due: number;
  bill_id: string;
};

export default function CalendarClient() {
  const supabase = getSupabaseClient();
  const { t } = useLocale();
  const [date, setDate] = useState(new Date());
  const [occ, setOcc] = useState<Occ[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{
    date: Date;
    bills: Occ[];
    holidayName?: string;
  } | null>(null);

  const ym = useMemo(
    () => ({ y: date.getFullYear(), m: date.getMonth() }),
    [date]
  );

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
        .select('id,due_date,state,amount_due,bill_id')
        .eq('org_id', orgId)
        .gte('due_date', startISO)
        .lte('due_date', endISO)
        .order('due_date');
      if (!cancelled) setOcc(data ?? []);
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
          onClick={() =>
            setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))
          }
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
          onClick={() =>
            setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))
          }
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
          return holiday
            ? 'border-amber-500'
            : weekend
              ? 'border-blue-400'
              : '';
        }}
        renderDay={(d) => {
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          const items = byDay.get(iso) ?? [];
          const holiday = getQuebecBankHolidayName(d);
          const total = items.reduce((sum, o) => sum + o.amount_due, 0);
          const hasContent = items.length > 0 || holiday;

          const handleDayClick = () => {
            setSelectedDay({
              date: d,
              bills: items.map((item) => ({
                ...item,
                title: `Bill ${item.bill_id.slice(0, 8)}`, // We'll use bill_id for now
                vendor_name: undefined,
              })),
              holidayName: holiday || undefined,
            });
          };

          return (
            <div
              className="group relative"
              onClick={hasContent ? handleDayClick : undefined}
              style={{ cursor: hasContent ? 'pointer' : 'default' }}
            >
              {/* Daily Total Display */}
              {items.length > 0 && (
                <div className="mt-1">
                  <div
                    className="rounded-lg px-3 py-2 text-center transition-colors group-hover:bg-opacity-80"
                    style={{
                      backgroundColor: 'rgba(59,130,246,0.1)',
                      border: '1px solid rgba(59,130,246,0.2)',
                    }}
                  >
                    <div className="text-xs font-medium text-blue-900 dark:text-blue-100">
                      ${total.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5">
                      {items.length} {items.length === 1 ? 'bill' : 'bills'}
                    </div>
                  </div>
                </div>
              )}

              {/* Holiday indicator */}
              {holiday && items.length === 0 && (
                <div className="mt-1">
                  <div className="rounded-lg px-2 py-1 text-center bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700">
                    <div className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      🎉 Holiday
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced hover tooltip - always show for every day */}
              <div className="pointer-events-none absolute left-0 top-8 z-20 hidden w-64 rounded-xl border border-neutral-200 bg-white dark:bg-gray-900 p-3 text-xs shadow-xl group-hover:block dark:border-neutral-800">
                <div className="mb-2 font-medium text-neutral-900 dark:text-neutral-100">
                  {d.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>

                {holiday && (
                  <div className="mb-2 rounded-lg bg-amber-100 px-2 py-1 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    <strong>🎉 Holiday:</strong> {holiday}
                  </div>
                )}

                {items.length > 0 ? (
                  <>
                    <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-blue-900 dark:text-blue-100">
                          {items.length}{' '}
                          {items.length === 1 ? 'Bill Due' : 'Bills Due'}
                        </span>
                        <span className="font-bold text-blue-900 dark:text-blue-100">
                          ${total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {items.slice(0, 5).map((o) => (
                        <div
                          key={o.id}
                          className="flex items-center justify-between py-1"
                        >
                          <div className="flex items-center flex-1 min-w-0">
                            <span
                              className={`inline-block w-2 h-2 rounded-full mr-2 flex-shrink-0 ${
                                o.state === 'approved'
                                  ? 'bg-green-500'
                                  : o.state === 'on_hold'
                                    ? 'bg-amber-500'
                                    : o.state === 'pending_approval'
                                      ? 'bg-blue-500'
                                      : o.state === 'paid'
                                        ? 'bg-emerald-500'
                                        : 'bg-gray-500'
                              }`}
                            ></span>
                            <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                              Bill {o.bill_id.slice(0, 8)}
                            </span>
                          </div>
                          <span className="font-medium text-xs ml-2">
                            ${o.amount_due.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {items.length > 5 && (
                        <div className="text-[10px] text-neutral-500 text-center pt-1">
                          +{items.length - 5} more bills...
                        </div>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700 text-center">
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        Click to view all bills →
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-neutral-500 dark:text-neutral-400">
                    {holiday
                      ? 'No bills due on this holiday'
                      : 'No bills due today'}
                  </div>
                )}
              </div>
            </div>
          );
        }}
      />
      {loading && <div className="text-sm text-neutral-500">Loading…</div>}

      {/* Day Details Modal */}
      {selectedDay && (
        <CalendarDayModal
          isOpen={!!selectedDay}
          onClose={() => setSelectedDay(null)}
          date={selectedDay.date}
          bills={selectedDay.bills}
          holidayName={selectedDay.holidayName}
        />
      )}
    </div>
  );
}
