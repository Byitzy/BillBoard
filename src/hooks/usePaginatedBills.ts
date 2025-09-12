/**
 * Hook for paginated bills with filtering and search using React Query
 * Integrates with the centralized status system
 */

import { getEffectiveStatus, type BillStatus } from '@/lib/bills/status';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

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
  // Date range filters
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
  // Amount range filters
  amountMin?: number;
  amountMax?: number;
  // Additional filters
  currency?: string;
  category?: string;
}

// Query keys for React Query
export const billsQueryKeys = {
  all: ['bills'] as const,
  lists: () => [...billsQueryKeys.all, 'list'] as const,
  list: (filters: BillFilters, page: number) =>
    [...billsQueryKeys.lists(), filters, page] as const,
  details: () => [...billsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...billsQueryKeys.details(), id] as const,
  nextDue: (billIds: string[]) =>
    [...billsQueryKeys.all, 'nextDue', billIds] as const,
};

/**
 * Fetch bills with React Query caching
 */
async function fetchBills(
  filters: BillFilters,
  page: number,
  pageSize: number = 20
): Promise<{
  data: BillRow[];
  totalCount: number;
}> {
  const supabase = getSupabaseClient();
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
  if (filters.currency) {
    query = query.eq('currency', filters.currency);
  }
  if (filters.category) {
    query = query.ilike('category', `%${filters.category}%`);
  }
  if (filters.dateFrom) {
    query = query.gte('due_date', filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte('due_date', filters.dateTo);
  }
  if (filters.amountMin !== undefined) {
    query = query.gte('amount_total', filters.amountMin);
  }
  if (filters.amountMax !== undefined) {
    query = query.lte('amount_total', filters.amountMax);
  }

  // Server-side search using OR conditions for better performance
  if (filters.search) {
    const searchTerm = `%${filters.search}%`;
    query = query.or(
      `title.ilike.${searchTerm},description.ilike.${searchTerm},category.ilike.${searchTerm}`
    );
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

  // Server-side search is now handled in the main query
  // No expensive client-side filtering needed

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
}

export function usePaginatedBills(filters: BillFilters = {}) {
  const queryClient = useQueryClient();

  /**
   * Use infinite query for pagination
   */
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: billsQueryKeys.list(filters, 1),
    queryFn: ({ pageParam = 1 }) => fetchBills(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      const totalLoaded = pages.reduce(
        (acc, page) => acc + page.data.length,
        0
      );
      return totalLoaded < lastPage.totalCount ? pages.length + 1 : undefined;
    },
    staleTime: 0, // Don't cache - always fetch fresh
    gcTime: 0, // Don't keep in memory
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnMount: false, // Don't refetch on mount if data exists
    retry: false, // Don't retry failed requests
  });

  // Flatten the data from all pages
  const bills = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) ?? [];
  }, [data]);

  const totalCount = data?.pages[0]?.totalCount ?? 0;

  /**
   * Get next due dates for recurring bills with React Query caching
   */
  const getNextDueDates = useCallback(async () => {
    const recurringBills = bills.filter((b) => !b.due_date);
    if (recurringBills.length === 0) return {};

    const supabase = getSupabaseClient();
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
      if (!nextDueMap[o.bill_id]) nextDueMap[o.bill_id] = o.due_date;
    });

    return nextDueMap;
  }, [bills]);

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
    if (filters.currency) {
      parts.push(`Currency: ${filters.currency}`);
    }
    if (filters.category) {
      parts.push(`Category: ${filters.category}`);
    }
    if (filters.dateFrom || filters.dateTo) {
      const dateRange = [
        filters.dateFrom && `from ${filters.dateFrom}`,
        filters.dateTo && `to ${filters.dateTo}`,
      ]
        .filter(Boolean)
        .join(' ');
      parts.push(`Date ${dateRange}`);
    }
    if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
      const amountRange = [
        filters.amountMin !== undefined && `min $${filters.amountMin}`,
        filters.amountMax !== undefined && `max $${filters.amountMax}`,
      ]
        .filter(Boolean)
        .join(' ');
      parts.push(`Amount ${amountRange}`);
    }

    return parts.join(' & ') || '';
  }, [filters]);

  // Computed values
  const isEmpty = bills.length === 0 && !isLoading;
  const isFiltered = Object.keys(filters).some(
    (key) => filters[key as keyof BillFilters]
  );

  return {
    items: bills,
    loading: isLoading,
    error: isError ? error : null,
    hasMore: hasNextPage,
    totalCount,
    loadMore: fetchNextPage,
    refetch,
    refresh: refetch,
    lastElementRef: null, // Not needed with React Query infinite scroll
    getNextDueDates,
    filterContext,
    isEmpty,
    isFiltered,
  };
}
