'use client';

import {
  CheckCircle,
  Download,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import React, { memo, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { useLocale } from '@/components/i18n/LocaleProvider';
import { useBillMutations } from '@/hooks/useBillMutations';
import { type BillFilters, type BillRow } from '@/hooks/usePaginatedBills';
import { getStatusInfo, type BillStatus } from '@/lib/bills/status';
import BillCard from './BillCard';

type BillsListPageProps = {
  initialBills: BillRow[];
  initialNextDue: Record<string, string | undefined>;
  initialError: string | null;
  initialFilterContext: string;
  vendorOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
  debugInfo?: any;
};

export default memo(function BillsListPage({
  initialBills,
  initialNextDue,
  initialError,
  initialFilterContext,
  vendorOptions,
  projectOptions,
  debugInfo,
}: BillsListPageProps) {
  const { t } = useLocale();

  const [nextDue, setNextDue] =
    useState<Record<string, string | undefined>>(initialNextDue);

  // Bulk selection state
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Extract filters from URL params with optimized parsing
  const searchParams = useSearchParams();
  const filters: BillFilters = useMemo(() => {
    const amountMinStr = searchParams.get('amountMin');
    const amountMaxStr = searchParams.get('amountMax');

    return {
      status: (searchParams.get('status') as BillStatus) || undefined,
      vendorId: searchParams.get('vendorId') || undefined,
      projectId: searchParams.get('projectId') || undefined,
      search: searchParams.get('search') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      amountMin: amountMinStr ? parseFloat(amountMinStr) : undefined,
      amountMax: amountMaxStr ? parseFloat(amountMaxStr) : undefined,
      currency: searchParams.get('currency') || undefined,
      category: searchParams.get('category') || undefined,
    };
  }, [searchParams]);

  // Hybrid approach: use server data if available, otherwise fetch client-side
  const shouldUseClientFetch = initialBills.length === 0 && !initialError;

  // Eliminate React Query completely - use simple fetch
  const [clientBills, setClientBills] = useState<BillRow[]>([]);
  const [clientLoading, setClientLoading] = useState(shouldUseClientFetch);
  const [clientError, setClientError] = useState<Error | null>(null);

  React.useEffect(() => {
    if (!shouldUseClientFetch) return;

    const fetchBills = async () => {
      try {
        setClientLoading(true);
        const { getSupabaseClient } = await import('@/lib/supabase/client');
        const { getDefaultOrgId } = await import('@/lib/org');

        const supabase = getSupabaseClient();
        const orgId = await getDefaultOrgId(supabase);

        if (!orgId) {
          throw new Error('No organization found');
        }

        const { data, error } = await supabase
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
            vendor_id,
            project_id,
            vendors(name),
            projects(name)
          `
          )
          .eq('org_id', orgId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        const bills = (data ?? []).map((row: any) => ({
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
          category: null,
        })) as BillRow[];

        setClientBills(bills);
      } catch (error) {
        console.error('Client fetch failed:', error);
        setClientError(error as Error);
      } finally {
        setClientLoading(false);
      }
    };

    fetchBills();
  }, [shouldUseClientFetch]);

  const clientHasMore = false;
  const clientLastElementRef = null;
  const clientRefresh = () => window.location.reload();
  const clientFilterContext = '';
  const clientIsEmpty = clientBills.length === 0 && !clientLoading;
  const clientIsFiltered = false;

  // Use server data if available, otherwise client data
  const bills = shouldUseClientFetch ? clientBills : initialBills;
  const loading = shouldUseClientFetch ? clientLoading : false;
  const error = shouldUseClientFetch
    ? clientError
    : initialError
      ? new Error(initialError)
      : null;
  const hasMore = shouldUseClientFetch ? clientHasMore : false;
  const lastElementRef = shouldUseClientFetch ? clientLastElementRef : null;
  const refresh = shouldUseClientFetch
    ? clientRefresh
    : () => window.location.reload();
  const filterContext = shouldUseClientFetch
    ? clientFilterContext
    : initialFilterContext;
  const isEmpty = shouldUseClientFetch ? clientIsEmpty : bills.length === 0;
  const isFiltered = shouldUseClientFetch ? clientIsFiltered : !!filterContext;

  // Debug logging
  console.log('Client BillsListPage (Hybrid):', {
    initialBillsLength: initialBills.length,
    shouldUseClientFetch,
    usingClientData: shouldUseClientFetch,
    finalBillsLength: bills.length,
    isEmpty,
    loading,
    error: error?.message,
    firstBill: bills[0],
    serverDebugInfo: debugInfo,
  });

  // Simplified - no need for deferred values with optimized queries
  const deferredBills = bills;
  const deferredSelectedBills = selectedBills;

  // Use React Query mutations
  const {
    updateStatus,
    markAsPaid,
    archiveBills,
    isUpdatingStatus,
    isMarkingAsPaid,
    isArchiving,
  } = useBillMutations();

  // Memoize expensive computations
  const billIds = useMemo(
    () => deferredBills.map((b) => b.id),
    [deferredBills]
  );

  const billStats = useMemo(
    () => ({
      total: deferredBills.length,
      recurring: deferredBills.filter((b) => b.recurring_rule).length,
      oneTime: deferredBills.filter((b) => !b.recurring_rule).length,
    }),
    [deferredBills]
  );

  // No debouncing needed with fast queries
  const debouncedBillCount = billStats.total;

  // No expensive batch loading needed - data comes from server

  // Simplified bulk selection handlers
  const handleSelectAll = () => {
    if (deferredSelectedBills.size === billStats.total) {
      setSelectedBills(new Set());
    } else {
      setSelectedBills(new Set(deferredBills.map((b) => b.id)));
    }
  };

  const handleSelectBill = (billId: string) => {
    const newSelected = new Set(selectedBills);
    if (newSelected.has(billId)) {
      newSelected.delete(billId);
    } else {
      newSelected.add(billId);
    }
    setSelectedBills(newSelected);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedBills.size === 0) return;

    const billIds = Array.from(selectedBills);

    try {
      switch (action) {
        case 'approve':
          await updateStatus({ billIds, newStatus: 'approved' });
          break;
        case 'paid':
          await markAsPaid(billIds);
          break;
        case 'hold':
          await updateStatus({ billIds, newStatus: 'on_hold' });
          break;
        case 'archive':
          await archiveBills(billIds);
          break;
        default:
          console.warn('Unknown bulk action:', action);
          return;
      }
      setSelectedBills(new Set());
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error);
    }
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedBills(new Set());
  };

  // Export data generation removed from render - only compute when actually needed

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {t('bills.title')}
                </h1>
                {debouncedBillCount > 0 && (
                  <span className="px-2 py-1 text-sm font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                    {debouncedBillCount}{' '}
                    {debouncedBillCount === 1 ? 'bill' : 'bills'}
                  </span>
                )}
              </div>
              {filterContext && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {filterContext}
                  </p>
                  <Link
                    href="/bills"
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium ml-2"
                  >
                    Clear →
                  </Link>
                </div>
              )}
              {isSelectMode && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <CheckCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                    {deferredSelectedBills.size} of {debouncedBillCount} bills
                    selected
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/bills/create"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Bill
              </Link>
              {debouncedBillCount > 0 && (
                <>
                  <button
                    onClick={() => setIsSelectMode(!isSelectMode)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {isSelectMode ? 'Exit Select' : 'Select Mode'}
                  </button>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors">
                      <Download className="h-4 w-4" />
                      CSV
                    </button>
                  </div>
                </>
              )}
              <button
                onClick={() => refresh()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {isSelectMode && selectedBills.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {selectedBills.size} bill{selectedBills.size !== 1 ? 's' : ''}{' '}
                selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction('approve')}
                disabled={isUpdatingStatus}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isUpdatingStatus ? 'Processing...' : 'Approve'}
              </button>
              <button
                onClick={() => handleBulkAction('paid')}
                disabled={isMarkingAsPaid}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isMarkingAsPaid ? 'Processing...' : 'Mark Paid'}
              </button>
              <button
                onClick={exitSelectMode}
                className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select All */}
      {isSelectMode && debouncedBillCount > 0 && (
        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={
                selectedBills.size === debouncedBillCount &&
                debouncedBillCount > 0
              }
              onChange={handleSelectAll}
              className="w-4 h-4 text-blue-600 bg-white border-neutral-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Select all {debouncedBillCount} bills
            </span>
          </label>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600">
          {error?.message || 'An error occurred'}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="text-lg font-medium text-neutral-600 dark:text-neutral-400">
            {t('common.loading')}
          </div>
        </div>
      ) : isEmpty ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <FileText className="h-6 w-6 text-neutral-400" />
          </div>
          <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
            {isFiltered ? 'No bills match the current filter' : 'No bills yet'}
          </p>
          <p className="text-neutral-500 mb-6">
            {isFiltered
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first bill to get started with managing your expenses and payments.'}
          </p>
          <Link
            href="/bills/create"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Your First Bill
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bills Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Total Bills
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {debouncedBillCount}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <RotateCcw className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Recurring Bills
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {billStats.recurring}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    One-time Bills
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {billStats.oneTime}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bills List */}
          {bills.map((bill, index) => (
            <BillCard
              key={bill.id}
              bill={bill}
              nextDue={nextDue[bill.id]}
              onRefresh={refresh}
              batchData={{
                occurrenceStates: new Map(),
                approverInfo: new Map(),
                nextDueDates: {},
              }}
              isSelectMode={isSelectMode}
              isSelected={selectedBills.has(bill.id)}
              onSelect={() => handleSelectBill(bill.id)}
              vendorOptions={vendorOptions}
              projectOptions={projectOptions}
              ref={index === bills.length - 1 ? lastElementRef : null}
            />
          ))}

          {/* Loading indicator */}
          {loading && debouncedBillCount > 0 && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* End of results */}
          {!hasMore && debouncedBillCount > 0 && (
            <div className="text-center py-4 text-sm text-neutral-500">
              All bills loaded ({debouncedBillCount} total)
            </div>
          )}
        </div>
      )}
    </div>
  );
});
