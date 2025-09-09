'use client';
import { useMemo } from 'react';
import KPI from '@/components/kpi/KPI';
import type { ProjectTotal } from '@/lib/metrics';

interface DashboardMetricsProps {
  todayTotal: number;
  weekTotal: number;
  twoWeeksTotal: number;
  onHoldCount: number;
  todayProjects: ProjectTotal[];
  weekProjects: ProjectTotal[];
  twoWeeksProjects: ProjectTotal[];
}

export default function DashboardMetrics({
  todayTotal,
  weekTotal,
  twoWeeksTotal,
  onHoldCount,
  todayProjects,
  weekProjects,
  twoWeeksProjects,
}: DashboardMetricsProps) {
  const kpis = useMemo(
    () => [
      {
        label: 'Today',
        value: `$${todayTotal.toFixed(2)}`,
        projectBreakdown: todayProjects,
        href: '/reports/today',
      },
      {
        label: 'This Week',
        value: `$${weekTotal.toFixed(2)}`,
        projectBreakdown: weekProjects,
        href: '/reports/week',
      },
      {
        label: 'Next 2 Weeks',
        value: `$${twoWeeksTotal.toFixed(2)}`,
        projectBreakdown: twoWeeksProjects,
        href: '/reports/two-weeks',
      },
      {
        label: 'On Hold',
        value: onHoldCount,
        tooltip: 'Occurrences on hold in next 14 days',
        href: '/reports/on-hold',
      },
    ],
    [
      todayTotal,
      weekTotal,
      twoWeeksTotal,
      onHoldCount,
      todayProjects,
      weekProjects,
      twoWeeksProjects,
    ]
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k, i) => (
        <KPI
          key={k.label}
          label={k.label}
          value={k.value}
          index={i}
          tooltip={k.tooltip as any}
          projectBreakdown={(k as any).projectBreakdown}
          href={k.href as any}
        />
      ))}
    </div>
  );
}
