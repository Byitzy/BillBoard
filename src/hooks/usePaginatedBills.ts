/**
 * Hook for paginated bills with filtering and search
 * Integrates with the centralized status system
 */

import { useCallback, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';
import { getEffectiveStatus, type BillStatus } from '@/lib/bills/status';
import { usePagination } from './usePagination';

export interface BillRow {
  id: string;
  title: string;
  amount_total: number;
  due_date: string | null;
  vendor_name: string | null;
  project_name: string | null;
  vendor_id: string | null;
  project_id: string | null;
  status: string;
  recurring_rule: any | null;
  created_at: string;
  currency: string;
  description: string | null;
  category: string | null;
}

export interface BillFilters {
  status?: BillStatus;
  vendorId?: string;
  projectId?: string;
  search?: string;
}

export function usePaginatedBills(filters: BillFilters = {}) {
  const supabase = getSupabaseClient();

  /**
   * Fetch bills with pagination support
   */
  const fetchBills = useCallback(
    async (page: number, pageSize: number) => {
      const orgId = await getDefaultOrgId(supabase);
      if (!orgId) throw new Error('No organization found');

      // Calculate offset for pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // Build query with filters
      let query = supabase
        .from('bills')
        .select(
          `
        id,
        title,
        amount_total,
        due_date,
        status,
        recurring_rule,
        created_at,
        currency,
        description,
        category,
        vendor_id,
        project_id,
        vendors(name),
        projects(name)
      `,
          { count: 'exact' }
        )
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .range(from, to);

      // Apply filters
      if (filters.vendorId) {
        query = query.eq('vendor_id', filters.vendorId);
      }
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data
      let bills = (data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        amount_total: row.amount_total,
        due_date: row.due_date,
        vendor_name: row.vendors?.name || null,
        project_name: row.projects?.name || null,
        vendor_id: row.vendor_id,
        project_id: row.project_id,
        status: row.status,
        recurring_rule: row.recurring_rule,
        created_at: row.created_at,
        currency: row.currency,
        description: row.description,
        category: row.category,
      })) as BillRow[];

      // Apply client-side search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        bills = bills.filter(
          (bill) =>
            bill.title.toLowerCase().includes(searchLower) ||
            (bill.vendor_name &&
              bill.vendor_name.toLowerCase().includes(searchLower)) ||
            (bill.project_name &&
              bill.project_name.toLowerCase().includes(searchLower)) ||
            (bill.description &&
              bill.description.toLowerCase().includes(searchLower)) ||
            (bill.category && bill.category.toLowerCase().includes(searchLower))
        );
      }

      // Handle status filtering with effective status
      if (filters.status) {
        // Get occurrence states for all bills to determine effective status
        const billIds = bills.map((bill) => bill.id);
        const { data: occurrenceData } = await supabase
          .from('bill_occurrences')
          .select('bill_id, state')
          .in('bill_id', billIds)
          .order('created_at', { ascending: false });

        // Create a map of bill_id -> occurrence_state
        const occurrenceStateMap = new Map();
        occurrenceData?.forEach((occ) => {
          if (!occurrenceStateMap.has(occ.bill_id)) {
            occurrenceStateMap.set(occ.bill_id, occ.state);
          }
        });

        // Filter by effective status
        bills = bills.filter((bill) => {
          const effectiveStatus = getEffectiveStatus(
            bill.status,
            occurrenceStateMap.get(bill.id) || null
          );
          return effectiveStatus === filters.status;
        });
      }

      return {
        data: bills,
        totalCount: count || 0,
      };
    },
    [supabase, filters]
  );

  const pagination = usePagination(fetchBills, {
    pageSize: 20,
  });

  /**
   * Get next due dates for recurring bills in current page
   */
  const getNextDueDates = useCallback(async () => {
    const recurringBills = pagination.items.filter((b) => !b.due_date);
    if (recurringBills.length === 0) return {};

    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const { data: occ } = await supabase
      .from('bill_occurrences')
      .select('bill_id,due_date')
      .in(
        'bill_id',
        recurringBills.map((b) => b.id)
      )
      .gte('due_date', iso)
      .order('due_date', { ascending: true });

    const nextDueMap: Record<string, string> = {};
    occ?.forEach((o: any) => {
      if (!nextDueMap[o.bill_id]) {
        nextDueMap[o.bill_id] = o.due_date;
      }
    });

    return nextDueMap;
  }, [pagination.items, supabase]);

  // Memoized filter context for display
  const filterContext = useMemo(() => {
    const parts: string[] = [];

    if (filters.status) {
      parts.push(`Status: ${filters.status}`);
    }
    if (filters.search) {
      parts.push(`Search: "${filters.search}"`);
    }
    if (filters.vendorId) {
      parts.push('Filtered by vendor');
    }
    if (filters.projectId) {
      parts.push('Filtered by project');
    }

    return parts.join(' & ') || '';
  }, [filters]);

  return {
    ...pagination,
    getNextDueDates,
    filterContext,

    // Computed values
    isEmpty: pagination.items.length === 0 && !pagination.loading,
    isFiltered: Object.keys(filters).some(
      (key) => filters[key as keyof BillFilters]
    ),
  };
}
