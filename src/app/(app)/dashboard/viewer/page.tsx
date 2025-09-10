'use client';
import {
  Eye,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  Building2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';

type ViewerStats = {
  totalBillsThisMonth: number;
  totalAmountThisMonth: number;
  upcomingBillsCount: number;
  upcomingBillsAmount: number;
  recentlyPaidCount: number;
  recentlyPaidAmount: number;
};

type RecentActivity = {
  id: string;
  type: 'paid' | 'approved' | 'scheduled';
  vendor_name: string;
  amount_due: number;
  due_date: string;
  updated_at: string;
};

export default function ViewerDashboard() {
  const { t } = useLocale();
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<ViewerStats>({
    totalBillsThisMonth: 0,
    totalAmountThisMonth: 0,
    upcomingBillsCount: 0,
    upcomingBillsAmount: 0,
    recentlyPaidCount: 0,
    recentlyPaidAmount: 0,
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    loadViewerDashboard();
  }, [supabase]);

  async function loadViewerDashboard() {
    setLoading(true);
    setError(null);

    try {
      const id = await getDefaultOrgId(supabase);
      if (!id) {
        setError('No organization found');
        setLoading(false);
        return;
      }

      await Promise.all([loadViewerStats(id), loadRecentActivity(id)]);
    } catch (e: any) {
      setError(e.message || 'Failed to load viewer dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function loadViewerStats(id: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextTwoWeeks = new Date();
    nextTwoWeeks.setDate(now.getDate() + 14);
    const lastWeek = new Date();
    lastWeek.setDate(now.getDate() - 7);

    const [
      { data: monthlyBills, count: monthlyCount },
      { data: upcomingBills, count: upcomingCount },
      { data: recentlyPaid, count: paidCount },
    ] = await Promise.all([
      supabase
        .from('bill_occurrences')
        .select('amount_due', { count: 'exact' })
        .eq('org_id', id)
        .gte('due_date', startOfMonth.toISOString().slice(0, 10)),
      supabase
        .from('bill_occurrences')
        .select('amount_due', { count: 'exact' })
        .eq('org_id', id)
        .in('state', ['scheduled', 'approved'])
        .gte('due_date', now.toISOString().slice(0, 10))
        .lte('due_date', nextTwoWeeks.toISOString().slice(0, 10)),
      supabase
        .from('bill_occurrences')
        .select('amount_due', { count: 'exact' })
        .eq('org_id', id)
        .eq('state', 'paid')
        .gte('updated_at', lastWeek.toISOString()),
    ]);

    setStats({
      totalBillsThisMonth: monthlyCount || 0,
      totalAmountThisMonth: sumAmounts(monthlyBills),
      upcomingBillsCount: upcomingCount || 0,
      upcomingBillsAmount: sumAmounts(upcomingBills),
      recentlyPaidCount: paidCount || 0,
      recentlyPaidAmount: sumAmounts(recentlyPaid),
    });
  }

  async function loadRecentActivity(id: string) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: activities } = await supabase
      .from('bill_occurrences')
      .select(
        `
        id,
        amount_due,
        due_date,
        state,
        updated_at,
        bills!inner(vendor_name)
      `
      )
      .eq('org_id', id)
      .gte('updated_at', oneWeekAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(10);

    if (!activities) return;

    const formattedActivities: RecentActivity[] = activities.map(
      (activity: any) => ({
        id: activity.id,
        type: activity.state as 'paid' | 'approved' | 'scheduled',
        vendor_name: activity.bills?.vendor_name || 'Unknown Vendor',
        amount_due: Number(activity.amount_due || 0),
        due_date: activity.due_date,
        updated_at: activity.updated_at,
      })
    );

    setRecentActivity(formattedActivities);
  }

  function sumAmounts(rows?: any[] | null) {
    if (!rows) return 0;
    return rows.reduce((acc, r) => acc + Number(r.amount_due || 0), 0);
  }

  function getActivityIcon(type: string) {
    switch (type) {
      case 'paid':
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case 'approved':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <FileText className="h-4 w-4 text-neutral-600" />;
    }
  }

  function getActivityColor(type: string) {
    switch (type) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'scheduled':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      default:
        return 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
    }
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
          onClick={loadViewerDashboard}
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
            {t('dashboard.title')} - Viewer
          </h1>
          <p className="text-sm text-neutral-500">
            Read-only overview of organization finances
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Eye className="h-4 w-4" />
          <span>View Only Access</span>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Latest bill updates from the past week
          </p>
        </div>

        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              No recent activity to display
            </div>
          ) : (
            recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {activity.vendor_name}
                      </p>
                      <p className="text-sm text-neutral-500">
                        Due: {new Date(activity.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${activity.amount_due.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getActivityColor(activity.type)}`}
                      >
                        {activity.type}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {new Date(activity.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Read-only Notice */}
      <div className="bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Eye className="h-5 w-5 text-neutral-600 mt-1 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100">
              View-Only Access
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              You have read-only access to this organization&apos;s financial
              information. You can view bills, reports, and activity but cannot
              make changes or approve payments.
            </p>
            <div className="mt-2 text-sm text-neutral-500">
              For assistance with bill management, please contact your
              organization administrator.
            </div>
          </div>
        </div>
      </div>

      {/* Limited Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <div>
              <p className="font-medium">View Bills</p>
              <p className="text-sm text-neutral-500">
                Browse all organization bills and details
              </p>
            </div>
          </div>
          <div className="mt-3 text-right">
            <span className="text-sm text-neutral-400">Read-only access</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium">View Reports</p>
              <p className="text-sm text-neutral-500">
                Access financial reports and analytics
              </p>
            </div>
          </div>
          <div className="mt-3 text-right">
            <span className="text-sm text-neutral-400">Read-only access</span>
          </div>
        </div>
      </div>
    </div>
  );
}
