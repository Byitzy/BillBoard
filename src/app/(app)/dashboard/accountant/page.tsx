'use client';
import {
  DollarSign,
  FileText,
  Calendar,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';

type FinancialStats = {
  totalMonthlyBills: number;
  paidThisMonth: number;
  unpaidOverdue: number;
  nextWeekTotal: number;
  averageMonthly: number;
  savingsThisMonth: number;
};

type ChartPoint = { m: string; v: number };

type UpcomingPayment = {
  id: string;
  vendor_name: string;
  amount_due: number;
  due_date: string;
  days_until_due: number;
  state: string;
};

export default function AccountantDashboard() {
  const { t } = useLocale();
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<FinancialStats>({
    totalMonthlyBills: 0,
    paidThisMonth: 0,
    unpaidOverdue: 0,
    nextWeekTotal: 0,
    averageMonthly: 0,
    savingsThisMonth: 0,
  });

  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>(
    []
  );
  const [overduePayments, setOverduePayments] = useState<UpcomingPayment[]>([]);

  useEffect(() => {
    loadAccountantDashboard();
  }, []);

  async function loadAccountantDashboard() {
    setLoading(true);
    setError(null);

    try {
      const id = await getDefaultOrgId(supabase);
      if (!id) {
        setError('No organization found');
        setLoading(false);
        return;
      }

      await Promise.all([
        loadFinancialStats(id),
        loadChartData(id),
        loadUpcomingPayments(id),
      ]);
    } catch (e: any) {
      setError(e.message || 'Failed to load accountant dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function loadFinancialStats(id: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const nextWeekEnd = new Date();
    nextWeekEnd.setDate(now.getDate() + 7);

    const startOfMonthISO = startOfMonth.toISOString().slice(0, 10);
    const endOfMonthISO = endOfMonth.toISOString().slice(0, 10);
    const todayISO = now.toISOString().slice(0, 10);
    const nextWeekISO = nextWeekEnd.toISOString().slice(0, 10);

    const [
      { data: monthlyBills },
      { data: paidBills },
      { data: overdueBills },
      { data: nextWeekBills },
    ] = await Promise.all([
      supabase
        .from('bill_occurrences')
        .select('amount_due')
        .eq('org_id', id)
        .gte('due_date', startOfMonthISO)
        .lte('due_date', endOfMonthISO),
      supabase
        .from('bill_occurrences')
        .select('amount_due')
        .eq('org_id', id)
        .eq('state', 'paid')
        .gte('due_date', startOfMonthISO)
        .lte('due_date', endOfMonthISO),
      supabase
        .from('bill_occurrences')
        .select('amount_due')
        .eq('org_id', id)
        .in('state', ['scheduled', 'approved'])
        .lt('due_date', todayISO),
      supabase
        .from('bill_occurrences')
        .select('amount_due')
        .eq('org_id', id)
        .in('state', ['scheduled', 'approved'])
        .gte('due_date', todayISO)
        .lte('due_date', nextWeekISO),
    ]);

    const totalMonthlyBills = sumAmounts(monthlyBills);
    const paidThisMonth = sumAmounts(paidBills);
    const unpaidOverdue = sumAmounts(overdueBills);
    const nextWeekTotal = sumAmounts(nextWeekBills);

    // Calculate 6-month average for comparison
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const { data: historicalData } = await supabase
      .from('bill_occurrences')
      .select('amount_due')
      .eq('org_id', id)
      .gte('due_date', sixMonthsAgo.toISOString().slice(0, 10))
      .lt('due_date', startOfMonthISO);

    const historicalTotal = sumAmounts(historicalData);
    const averageMonthly = historicalTotal / 6;
    const savingsThisMonth = averageMonthly - totalMonthlyBills;

    setStats({
      totalMonthlyBills,
      paidThisMonth,
      unpaidOverdue,
      nextWeekTotal,
      averageMonthly,
      savingsThisMonth,
    });
  }

  async function loadChartData(id: string) {
    const today = new Date();
    const chartStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    const chartEnd = new Date(today.getFullYear(), today.getMonth() + 7, 0);

    const { data: occ } = await supabase
      .from('bill_occurrences')
      .select('amount_due,due_date')
      .eq('org_id', id)
      .gte('due_date', chartStart.toISOString().slice(0, 10))
      .lte('due_date', chartEnd.toISOString().slice(0, 10));

    const map = new Map<string, number>();
    (occ ?? []).forEach((o: any) => {
      const d = new Date(o.due_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + Number(o.amount_due || 0));
    });

    const pts: ChartPoint[] = [];
    for (let i = -5; i <= 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString(undefined, {
        month: 'short',
        year: '2-digit',
      });
      pts.push({
        m: label,
        v: Math.round((map.get(key) ?? 0) * 100) / 100,
      });
    }
    setChart(pts);
  }

  async function loadUpcomingPayments(id: string) {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);

    const { data: payments } = await supabase
      .from('bill_occurrences')
      .select(
        `
        id,
        amount_due,
        due_date,
        state,
        bills!inner(vendor_name)
      `
      )
      .eq('org_id', id)
      .in('state', ['scheduled', 'approved'])
      .gte('due_date', today.toISOString().slice(0, 10))
      .lte('due_date', nextMonth.toISOString().slice(0, 10))
      .order('due_date', { ascending: true })
      .limit(15);

    const { data: overdue } = await supabase
      .from('bill_occurrences')
      .select(
        `
        id,
        amount_due,
        due_date,
        state,
        bills!inner(vendor_name)
      `
      )
      .eq('org_id', id)
      .in('state', ['scheduled', 'approved'])
      .lt('due_date', today.toISOString().slice(0, 10))
      .order('due_date', { ascending: false })
      .limit(10);

    const processPayments = (items: any[]) =>
      items.map((item: any) => {
        const dueDate = new Date(item.due_date);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          id: item.id,
          vendor_name: item.bills?.vendor_name || 'Unknown Vendor',
          amount_due: Number(item.amount_due || 0),
          due_date: item.due_date,
          days_until_due: diffDays,
          state: item.state,
        };
      });

    setUpcomingPayments(processPayments(payments || []));
    setOverduePayments(processPayments(overdue || []));
  }

  function sumAmounts(rows?: any[] | null) {
    if (!rows) return 0;
    return rows.reduce((acc, r) => acc + Number(r.amount_due || 0), 0);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadAccountantDashboard}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {t('dashboard.title')} - Accountant
          </h1>
          <p className="text-sm text-neutral-500">
            Financial overview and bill management
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/bills"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
          >
            <FileText className="h-4 w-4" />
            Manage Bills
          </Link>
        </div>
      </div>

      {/* Overdue Alert */}
      {stats.unpaidOverdue > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200">
                Overdue Bills: ${stats.unpaidOverdue.toFixed(2)}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {overduePayments.length} bills are overdue and require immediate
                attention.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <h2 className="text-lg font-semibold mb-4">Monthly Cash Flow</h2>
        <DashboardCharts chart={chart} rows={[]} loading={false} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Payments */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold">Upcoming Payments</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Next 30 days
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {upcomingPayments.length === 0 ? (
              <div className="p-4 text-center text-neutral-500">
                No upcoming payments
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {upcomingPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {payment.vendor_name}
                        </p>
                        <p className="text-sm text-neutral-500">
                          Due {new Date(payment.due_date).toLocaleDateString()}
                          {payment.days_until_due <= 7 && (
                            <span className="ml-2 text-orange-600">
                              ({payment.days_until_due} days)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${payment.amount_due.toFixed(2)}
                        </p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            payment.state === 'approved'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                          }`}
                        >
                          {payment.state}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Overdue Payments */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-red-200 dark:border-red-800 overflow-hidden">
          <div className="p-4 border-b border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">
              Overdue Payments
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300">
              Require immediate attention
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {overduePayments.length === 0 ? (
              <div className="p-4 text-center text-neutral-500">
                No overdue payments
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {overduePayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 hover:bg-red-50 dark:hover:bg-red-900/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {payment.vendor_name}
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Due {new Date(payment.due_date).toLocaleDateString()}
                          <span className="ml-2">
                            ({Math.abs(payment.days_until_due)} days overdue)
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-900 dark:text-red-200">
                          ${payment.amount_due.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
