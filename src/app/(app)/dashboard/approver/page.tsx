'use client';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  FileText,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';

type ApprovalStats = {
  pendingApprovals: number;
  approvedToday: number;
  onHoldItems: number;
  totalValue: number;
};

type PendingItem = {
  id: string;
  bill_id: string;
  vendor_name: string;
  project_name: string;
  amount_due: number;
  due_date: string;
  days_until_due: number;
};

export default function ApproverDashboard() {
  const { t } = useLocale();
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<ApprovalStats>({
    pendingApprovals: 0,
    approvedToday: 0,
    onHoldItems: 0,
    totalValue: 0,
  });

  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [urgentItems, setUrgentItems] = useState<PendingItem[]>([]);

  useEffect(() => {
    loadApproverDashboard();
  }, [supabase]);

  async function loadApproverDashboard() {
    setLoading(true);
    setError(null);

    try {
      const id = await getDefaultOrgId(supabase);
      if (!id) {
        setError('No organization found');
        setLoading(false);
        return;
      }

      await Promise.all([loadApprovalStats(id), loadPendingItems(id)]);
    } catch (e: any) {
      setError(e.message || 'Failed to load approver dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function loadApprovalStats(id: string) {
    const today = new Date().toISOString().slice(0, 10);

    const [
      { count: pendingApprovals, data: pendingData },
      { count: approvedToday },
      { count: onHoldItems },
    ] = await Promise.all([
      supabase
        .from('bill_occurrences')
        .select('amount_due', { count: 'exact' })
        .eq('org_id', id)
        .eq('state', 'scheduled'),
      supabase
        .from('bill_occurrences')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', id)
        .eq('state', 'approved')
        .gte('updated_at', today),
      supabase
        .from('bill_occurrences')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', id)
        .eq('state', 'on_hold'),
    ]);

    const totalValue = (pendingData || []).reduce(
      (sum, item) => sum + Number(item.amount_due || 0),
      0
    );

    setStats({
      pendingApprovals: pendingApprovals ?? 0,
      approvedToday: approvedToday ?? 0,
      onHoldItems: onHoldItems ?? 0,
      totalValue,
    });
  }

  async function loadPendingItems(id: string) {
    const { data: items } = await supabase
      .from('bill_occurrences')
      .select(
        `
        id,
        bill_id,
        amount_due,
        due_date,
        bills!inner(
          vendor_name,
          project_name
        )
      `
      )
      .eq('org_id', id)
      .eq('state', 'scheduled')
      .order('due_date', { ascending: true })
      .limit(20);

    if (!items) return;

    const today = new Date();
    const processedItems = items.map((item: any) => {
      const dueDate = new Date(item.due_date);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: item.id,
        bill_id: item.bill_id,
        vendor_name: item.bills?.vendor_name || 'Unknown Vendor',
        project_name: item.bills?.project_name || 'No Project',
        amount_due: Number(item.amount_due || 0),
        due_date: item.due_date,
        days_until_due: diffDays,
      };
    });

    setPendingItems(processedItems);
    setUrgentItems(processedItems.filter((item) => item.days_until_due <= 3));
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
          onClick={loadApproverDashboard}
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
            {t('dashboard.title')} - Approver
          </h1>
          <p className="text-sm text-neutral-500">
            Review and approve pending bills
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/approvals"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
          >
            <CheckSquare className="h-4 w-4" />
            Review All Approvals
          </Link>
        </div>
      </div>

      {/* Urgent Items Alert */}
      {urgentItems.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200">
                Urgent: {urgentItems.length} items due within 3 days
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                These items require immediate attention to avoid payment delays.
              </p>
              <Link
                href="/approvals"
                className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-red-600 hover:text-red-700"
              >
                Review urgent items →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Pending Approvals Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Pending Approvals</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Items awaiting your approval, sorted by due date
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                <th className="px-4 py-3 text-left font-medium text-neutral-900 dark:text-neutral-100">
                  Vendor
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-900 dark:text-neutral-100">
                  Project
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-900 dark:text-neutral-100">
                  Amount
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-900 dark:text-neutral-100">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-900 dark:text-neutral-100">
                  Urgency
                </th>
                <th className="px-4 py-3 text-left font-medium text-neutral-900 dark:text-neutral-100">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {pendingItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-neutral-500"
                  >
                    No pending approvals
                  </td>
                </tr>
              ) : (
                pendingItems.slice(0, 10).map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {item.vendor_name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-neutral-700 dark:text-neutral-300">
                        {item.project_name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        ${item.amount_due.toFixed(2)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-neutral-600 dark:text-neutral-400">
                        {new Date(item.due_date).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.days_until_due <= 1
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                            : item.days_until_due <= 3
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                              : item.days_until_due <= 7
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                        }`}
                      >
                        {item.days_until_due <= 0
                          ? 'Overdue'
                          : item.days_until_due === 1
                            ? 'Due tomorrow'
                            : `${item.days_until_due} days`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/bills/${item.bill_id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/40"
                      >
                        <FileText className="h-3 w-3" />
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pendingItems.length > 10 && (
          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 text-center">
            <Link
              href="/approvals"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              View all {pendingItems.length} pending approvals →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
