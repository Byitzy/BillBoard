import type { SupabaseClient } from '@supabase/supabase-js';

export type DateRange = {
  start: string; // ISO date string
  end: string; // ISO date string
};

export type BillState =
  | 'scheduled'
  | 'approved'
  | 'on_hold'
  | 'paid'
  | 'cancelled';

export type ProjectTotal = {
  project: string;
  total: number;
};

/**
 * Get per-project totals for a specific date range and bill states
 */
export async function getTotalsByProject(
  supabase: SupabaseClient,
  orgId: string,
  range: DateRange,
  opts?: { states?: BillState[] }
): Promise<ProjectTotal[]> {
  const states = opts?.states ?? ['scheduled', 'approved'];

  const { data, error } = await supabase
    .from('bill_occurrences')
    .select(
      `
      amount_due,
      bills!inner (
        projects (name)
      )
    `
    )
    .eq('org_id', orgId)
    .in('state', states)
    .gte('due_date', range.start)
    .lte('due_date', range.end);

  if (error) {
    return [];
  }

  // Aggregate by project
  const projectMap = new Map<string, number>();

  (data || []).forEach((occurrence: any) => {
    const amount = Number(occurrence.amount_due || 0);
    const projectName = occurrence.bills?.projects?.name || 'No Project';

    projectMap.set(projectName, (projectMap.get(projectName) || 0) + amount);
  });

  // Convert to array and sort by total (descending)
  return Array.from(projectMap.entries())
    .map(([project, total]) => ({ project, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Format currency value using existing app formatting
 */
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
