/**
 * React Query hook for dashboard data with intelligent caching
 */

import { getTotalsByProject, type ProjectTotal } from '@/lib/metrics';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Query keys for dashboard
export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  metrics: (orgId: string) =>
    [...dashboardQueryKeys.all, 'metrics', orgId] as const,
  chart: (orgId: string, dateRange: { start: string; end: string }) =>
    [...dashboardQueryKeys.all, 'chart', orgId, dateRange] as const,
  projects: (orgId: string, dateRange: { start: string; end: string }) =>
    [...dashboardQueryKeys.all, 'projects', orgId, dateRange] as const,
  recent: (orgId: string) =>
    [...dashboardQueryKeys.all, 'recent', orgId] as const,
};

export interface DashboardMetrics {
  todayTotal: number;
  weekTotal: number;
  twoWeeksTotal: number;
  onHoldCount: number;
  todayProjects: ProjectTotal[];
  weekProjects: ProjectTotal[];
  twoWeeksProjects: ProjectTotal[];
}

export interface ChartData {
  m: string;
  v: number;
}

export interface RecentBill {
  id: string;
  bill_id?: string;
  vendor?: string | null;
  project?: string | null;
  due_date: string;
  amount_due: number;
  state: string;
}

/**
 * Fetch dashboard metrics with caching
 */
async function fetchDashboardMetrics(orgId: string): Promise<DashboardMetrics> {
  const supabase = getSupabaseClient();

  // Calculate dates once
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const endTwoWeeks = new Date(today);
  endTwoWeeks.setDate(today.getDate() + 14);

  const dateRange = {
    today: today.toISOString().slice(0, 10),
    weekStart: startOfWeek.toISOString().slice(0, 10),
    weekEnd: endOfWeek.toISOString().slice(0, 10),
    twoWeeksEnd: endTwoWeeks.toISOString().slice(0, 10),
  };

  // Execute all queries in parallel with Promise.allSettled for better error handling
  const queries = await Promise.allSettled([
    // Today's total
    supabase
      .from('bill_occurrences')
      .select('amount_due')
      .eq('org_id', orgId)
      .in('state', ['scheduled', 'approved'])
      .eq('due_date', dateRange.today),

    // Week's total
    supabase
      .from('bill_occurrences')
      .select('amount_due')
      .eq('org_id', orgId)
      .in('state', ['scheduled', 'approved'])
      .gte('due_date', dateRange.weekStart)
      .lte('due_date', dateRange.weekEnd),

    // Two weeks' total
    supabase
      .from('bill_occurrences')
      .select('amount_due')
      .eq('org_id', orgId)
      .in('state', ['scheduled', 'approved'])
      .gte('due_date', dateRange.today)
      .lte('due_date', dateRange.twoWeeksEnd),

    // On hold count
    supabase
      .from('bill_occurrences')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('state', 'on_hold')
      .gte('due_date', dateRange.today)
      .lte('due_date', dateRange.twoWeeksEnd),

    // Project breakdowns
    getTotalsByProject(supabase, orgId, {
      start: dateRange.today,
      end: dateRange.today,
    }),
    getTotalsByProject(supabase, orgId, {
      start: dateRange.weekStart,
      end: dateRange.weekEnd,
    }),
    getTotalsByProject(supabase, orgId, {
      start: dateRange.today,
      end: dateRange.twoWeeksEnd,
    }),
  ]);

  const [
    tResult,
    wResult,
    twResult,
    holdResult,
    todayProjResult,
    weekProjResult,
    twoWeeksProjResult,
  ] = queries;

  return {
    todayTotal:
      tResult.status === 'fulfilled' ? sumAmounts(tResult.value.data) : 0,
    weekTotal:
      wResult.status === 'fulfilled' ? sumAmounts(wResult.value.data) : 0,
    twoWeeksTotal:
      twResult.status === 'fulfilled' ? sumAmounts(twResult.value.data) : 0,
    onHoldCount:
      holdResult.status === 'fulfilled' ? holdResult.value.count ?? 0 : 0,
    todayProjects:
      todayProjResult.status === 'fulfilled' ? todayProjResult.value : [],
    weekProjects:
      weekProjResult.status === 'fulfilled' ? weekProjResult.value : [],
    twoWeeksProjects:
      twoWeeksProjResult.status === 'fulfilled' ? twoWeeksProjResult.value : [],
  };
}

/**
 * Fetch chart data with caching
 */
async function fetchChartData(
  orgId: string,
  dateRange: { start: string; end: string }
): Promise<ChartData[]> {
  const supabase = getSupabaseClient();

  const { data: occ } = await supabase
    .from('bill_occurrences')
    .select('amount_due, due_date')
    .eq('org_id', orgId)
    .gte('due_date', dateRange.start)
    .lte('due_date', dateRange.end);

  const map = new Map<string, number>();
  (occ ?? []).forEach((o: any) => {
    const d = new Date(o.due_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map.set(key, (map.get(key) ?? 0) + Number(o.amount_due || 0));
  });

  const today = new Date();
  const pts: ChartData[] = [];
  for (let i = -3; i <= 9; i++) {
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

  return pts;
}

/**
 * Fetch recent bills with caching
 */
async function fetchRecentBills(orgId: string): Promise<RecentBill[]> {
  const supabase = getSupabaseClient();

  const { data: recent } = await supabase
    .from('bill_occurrences')
    .select(
      `
      id,
      bill_id,
      due_date,
      amount_due,
      state,
      bills(
        id,
        vendors(name),
        projects(name)
      )
    `
    )
    .eq('org_id', orgId)
    .order('due_date', { ascending: true })
    .limit(10);

  return (recent ?? []).map((r: any) => ({
    id: r.id,
    bill_id: r.bill_id,
    vendor: r.bills?.vendors?.name || null,
    project: r.bills?.projects?.name || null,
    due_date: r.due_date,
    amount_due: Number(r.amount_due),
    state: r.state,
  }));
}

function sumAmounts(rows?: any[] | null) {
  if (!rows) return 0;
  return rows.reduce((acc, r) => acc + Number(r.amount_due || 0), 0);
}

/**
 * React Query hooks for dashboard data
 */
export function useDashboardData() {
  // Get organization ID
  const { data: orgId, isLoading: orgLoading } = useQuery({
    queryKey: ['org-id'],
    queryFn: () => getDefaultOrgId(getSupabaseClient()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate date ranges for chart
  const today = new Date();
  const chartStart = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  const chartEnd = new Date(today.getFullYear(), today.getMonth() + 10, 0);
  const chartDateRange = {
    start: chartStart.toISOString().slice(0, 10),
    end: chartEnd.toISOString().slice(0, 10),
  };

  // Dashboard metrics query
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: dashboardQueryKeys.metrics(orgId || ''),
    queryFn: () => fetchDashboardMetrics(orgId!),
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Chart data query
  const {
    data: chart,
    isLoading: chartLoading,
    error: chartError,
  } = useQuery({
    queryKey: dashboardQueryKeys.chart(orgId || '', chartDateRange),
    queryFn: () => fetchChartData(orgId!, chartDateRange),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Recent bills query
  const {
    data: recent,
    isLoading: recentLoading,
    error: recentError,
  } = useQuery({
    queryKey: dashboardQueryKeys.recent(orgId || ''),
    queryFn: () => fetchRecentBills(orgId!),
    enabled: !!orgId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    // Data
    metrics,
    chart,
    recent,

    // Loading states
    isLoading: orgLoading || metricsLoading || chartLoading || recentLoading,

    // Errors
    error: metricsError || chartError || recentError,

    // Actions
    refetchMetrics,

    // Computed values
    todayTotal: metrics?.todayTotal ?? 0,
    weekTotal: metrics?.weekTotal ?? 0,
    twoWeeksTotal: metrics?.twoWeeksTotal ?? 0,
    onHoldCount: metrics?.onHoldCount ?? 0,
    todayProjects: metrics?.todayProjects ?? [],
    weekProjects: metrics?.weekProjects ?? [],
    twoWeeksProjects: metrics?.twoWeeksProjects ?? [],
    rows: recent ?? [],
  };
}
