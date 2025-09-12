'use client';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import DashboardMetrics from '@/components/dashboard/DashboardMetrics';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function DashboardClient() {
  const {
    todayTotal,
    weekTotal,
    twoWeeksTotal,
    onHoldCount,
    todayProjects,
    weekProjects,
    twoWeeksProjects,
    chart,
    rows,
    isLoading,
    error,
  } = useDashboardData();

  return (
    <div className="space-y-6">
      {error && (
        <div className="text-sm text-red-600">
          {error.message || 'Failed to load dashboard'}
        </div>
      )}

      <DashboardMetrics
        todayTotal={todayTotal}
        weekTotal={weekTotal}
        twoWeeksTotal={twoWeeksTotal}
        onHoldCount={onHoldCount}
        todayProjects={todayProjects}
        weekProjects={weekProjects}
        twoWeeksProjects={twoWeeksProjects}
      />

      <DashboardCharts
        chart={chart || []}
        rows={rows || []}
        loading={isLoading}
      />
    </div>
  );
}
