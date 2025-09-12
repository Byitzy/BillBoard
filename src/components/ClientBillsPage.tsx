'use client';
import {
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  FileText,
  Filter,
  FolderOpen,
  Plus,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import {
  forwardRef,
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
  useDeferredValue,
} from 'react';

// Import hooks synchronously (can't be lazy loaded)
import { useLocale } from '@/components/i18n/LocaleProvider';
import { useBillMutations } from '@/hooks/useBillMutations';
import { useBillOperations } from '@/hooks/useBillOperations';
import { useBillsBatch, type BillBatchData } from '@/hooks/useBillsBatch';
import {
  usePaginatedBills,
  type BillFilters,
  type BillRow,
} from '@/hooks/usePaginatedBills';
import {
  getEffectiveStatus,
  getStatusInfo,
  type BillStatus,
} from '@/lib/bills/status';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useDebounce, useStableCallback } from '@/utils/performance';
import {
  usePerformanceMonitor,
  useTaskMonitor,
} from '@/hooks/usePerformanceMonitor';

// Lazy load ONLY heavy components that aren't needed immediately
const BillForm = lazy(() => import('@/components/BillForm'));
const CSVExportButton = lazy(() => import('@/components/CSVExportButton'));
const PDFExportButton = lazy(() => import('@/components/PDFExportButton'));
const AdvancedFilterBar = lazy(
  () => import('@/components/ui/AdvancedFilterBar')
);
const SavedSearches = lazy(() => import('@/components/ui/SavedSearches'));
const BillEditForm = lazy(() => import('@/components/bills/BillEditForm'));

type ClientBillsPageProps = {
  initialBills: BillRow[];
  initialNextDue: Record<string, string | undefined>;
  initialError: string | null;
  initialFilterContext: string;
  vendorOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
};

export default function ClientBillsPage({
  initialBills,
  initialNextDue,
  initialError,
  initialFilterContext,
  vendorOptions,
  projectOptions,
}: ClientBillsPageProps) {
  const { t } = useLocale();

  // Performance monitoring
  usePerformanceMonitor('ClientBillsPage');
  useTaskMonitor();

  const [nextDue, setNextDue] = useState<Record<string, string | undefined>>(
    {}
  );
  const [batchData, setBatchData] = useState<BillBatchData>({
    occurrenceStates: new Map(),
    approverInfo: new Map(),
    nextDueDates: {},
  });

  // Bulk selection state with performance optimizations
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Extract filters from URL params
  const urlParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const filters: BillFilters = {
    status: (urlParams.get('status') as BillStatus) || undefined,
    vendorId: urlParams.get('vendorId') || undefined,
    projectId: urlParams.get('projectId') || undefined,
    search: urlParams.get('search') || undefined,
    dateFrom: urlParams.get('dateFrom') || undefined,
    dateTo: urlParams.get('dateTo') || undefined,
    amountMin: urlParams.get('amountMin')
      ? parseFloat(urlParams.get('amountMin')!)
      : undefined,
    amountMax: urlParams.get('amountMax')
      ? parseFloat(urlParams.get('amountMax')!)
      : undefined,
    currency: urlParams.get('currency') || undefined,
    category: urlParams.get('category') || undefined,
  };

  // Use paginated bills hook
  const {
    items: bills,
    loading,
    error,
    hasMore,
    lastElementRef,
    refresh,
    getNextDueDates,
    filterContext,
    isEmpty,
    isFiltered,
  } = usePaginatedBills(filters);

  // Defer expensive computations to prevent blocking (after bills is defined)
  const deferredBills = useDeferredValue(bills);
  const deferredSelectedBills = useDeferredValue(selectedBills);

  // Use batch operations hook for optimized queries
  const { loadBillsBatchData } = useBillsBatch();

  // Use React Query mutations for optimistic updates
  const {
    updateStatus,
    markAsPaid,
    archiveBills,
    isUpdatingStatus,
    isMarkingAsPaid,
    isArchiving,
  } = useBillMutations();

  // Memoize expensive computations with deferred values
  const billIds = useMemo(
    () => deferredBills.map((b) => b.id),
    [deferredBills]
  );

  // Use stable references for computed values to prevent cascading re-renders
  const billStats = useMemo(
    () => ({
      total: deferredBills.length,
      recurring: deferredBills.filter((b) => b.recurring_rule).length,
      oneTime: deferredBills.filter((b) => !b.recurring_rule).length,
    }),
    [deferredBills]
  );

  // Debounce expensive operations
  const debouncedBillCount = useDebounce(billStats.total, 100);

  // Backward compatibility aliases
  const billCount = debouncedBillCount;
  const recurringBillCount = billStats.recurring;
  const oneTimeBillCount = billStats.oneTime;

  // Optimized initial load with transition
  useEffect(() => {
    // Only refresh if we don't have any bills yet
    if (bills.length === 0 && !loading) {
      startTransition(() => {
        refresh();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array for mount-only effect

  useEffect(() => {
    // Load batch data with transition to prevent blocking
    if (billIds.length > 0) {
      startTransition(() => {
        loadBillsBatchData(billIds)
          .then((data) => {
            setBatchData(data);
            setNextDue(data.nextDueDates);
          })
          .catch((err) => {
            console.error('Failed to load batch data:', err);
          });
      });
    } else {
      // Clear batch data when no bills
      setBatchData({
        occurrenceStates: new Map(),
        approverInfo: new Map(),
        nextDueDates: {},
      });
      setNextDue({});
    }
  }, [billIds, loadBillsBatchData]); // Use memoized billIds

  // Optimized bulk selection handlers with stable references
  const handleSelectAll = useStableCallback(() => {
    startTransition(() => {
      if (deferredSelectedBills.size === billStats.total) {
        setSelectedBills(new Set());
      } else {
        setSelectedBills(new Set(deferredBills.map((b) => b.id)));
      }
    });
  });

  const handleSelectBill = useStableCallback((billId: string) => {
    startTransition(() => {
      const newSelected = new Set(selectedBills);
      if (newSelected.has(billId)) {
        newSelected.delete(billId);
      } else {
        newSelected.add(billId);
      }
      setSelectedBills(newSelected);
    });
  });

  const handleBulkAction = async (action: string) => {
    if (selectedBills.size === 0) return;

    const billIds = Array.from(selectedBills);

    try {
      switch (action) {
        case 'approve':
          await updateStatus({ billIds, newStatus: 'approved' });
          console.log(`Successfully approved ${billIds.length} bills`);
          break;
        case 'paid':
          await markAsPaid(billIds);
          console.log(`Successfully marked ${billIds.length} bills as paid`);
          break;
        case 'hold':
          await updateStatus({ billIds, newStatus: 'on_hold' });
          console.log(`Successfully put ${billIds.length} bills on hold`);
          break;
        case 'archive':
          await archiveBills(billIds);
          console.log(`Successfully archived ${billIds.length} bills`);
          break;
        default:
          console.warn('Unknown bulk action:', action);
          return;
      }

      // Clear selection - React Query will handle cache invalidation automatically
      setSelectedBills(new Set());
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error);
    }
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedBills(new Set());
  };

  // Handle filter changes from saved searches
  const handleFiltersChange = useCallback(
    (newFilters: any) => {
      // This will be handled by the AdvancedFilterBar component
      // through URL parameter updates, which will trigger a refresh
      refresh();
    },
    [refresh]
  );

  // Memoize expensive calculations with deferred values
  const headerData = useMemo(
    () => ({
      billCount: debouncedBillCount,
      filterContext,
      isSelectMode,
      selectedBillsCount: deferredSelectedBills.size,
    }),
    [
      debouncedBillCount,
      filterContext,
      isSelectMode,
      deferredSelectedBills.size,
    ]
  );

  // Defer export data computation to prevent blocking
  const exportData = useMemo(
    () =>
      deferredBills.map((b) => ({
        Title: b.title,
        Vendor: b.vendor_name ?? '—',
        Project: b.project_name ?? '—',
        Amount: `${b.currency} $${b.amount_total.toFixed(2)}`,
        'Due Date': b.due_date ?? nextDue[b.id] ?? '—',
        Status: getStatusInfo(b.status as BillStatus).label,
        Type: b.recurring_rule ? 'Recurring' : 'One-time',
        Category: b.category ?? '—',
      })),
    [deferredBills, nextDue]
  );

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
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
                {headerData.billCount > 0 && (
                  <span className="px-2 py-1 text-sm font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded-full">
                    {headerData.billCount}{' '}
                    {headerData.billCount === 1 ? 'bill' : 'bills'}
                  </span>
                )}
              </div>
              {headerData.filterContext && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Filter className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {headerData.filterContext}
                  </p>
                  <Link
                    href="/bills"
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium ml-2"
                  >
                    Clear →
                  </Link>
                </div>
              )}
              {headerData.isSelectMode && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <CheckCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                    {headerData.selectedBillsCount} of {headerData.billCount}{' '}
                    bills selected
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {headerData.billCount > 0 && (
                <button
                  onClick={() => setIsSelectMode(!headerData.isSelectMode)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  {headerData.isSelectMode ? 'Exit Select' : 'Select Mode'}
                </button>
              )}
              {headerData.billCount > 0 && (
                <div className="flex items-center gap-2">
                  <Suspense
                    fallback={
                      <div className="animate-pulse h-10 w-16 bg-neutral-100 dark:bg-neutral-800 rounded"></div>
                    }
                  >
                    <CSVExportButton
                      type="data"
                      data={exportData}
                      columns={[
                        'Title',
                        'Vendor',
                        'Project',
                        'Amount',
                        'Due Date',
                        'Status',
                        'Type',
                        'Category',
                      ]}
                      filename={`bills-list-${new Date().toISOString().slice(0, 10)}.csv`}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </CSVExportButton>
                  </Suspense>
                  <Suspense
                    fallback={
                      <div className="animate-pulse h-10 w-16 bg-neutral-100 dark:bg-neutral-800 rounded"></div>
                    }
                  >
                    <PDFExportButton
                      type="data"
                      data={exportData}
                      columns={[
                        'Title',
                        'Vendor',
                        'Project',
                        'Amount',
                        'Due Date',
                        'Status',
                        'Type',
                        'Category',
                      ]}
                      title="Bills List"
                      filename={`bills-list-${new Date().toISOString().slice(0, 10)}.pdf`}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </PDFExportButton>
                  </Suspense>
                </div>
              )}
              <button
                onClick={() => {
                  refresh();
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
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
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                {isUpdatingStatus
                  ? 'Processing...'
                  : `Approve ${selectedBills.size}`}
              </button>
              <button
                onClick={() => handleBulkAction('paid')}
                disabled={isMarkingAsPaid}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <DollarSign className="h-4 w-4" />
                {isMarkingAsPaid ? 'Processing...' : 'Mark Paid'}
              </button>
              <button
                onClick={() => handleBulkAction('hold')}
                disabled={isUpdatingStatus}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Clock className="h-4 w-4" />
                {isUpdatingStatus ? 'Processing...' : 'Put on Hold'}
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                disabled={isArchiving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isArchiving ? 'Archiving...' : `Archive ${selectedBills.size}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Bill Creation Form */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
              <Plus className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Create New Bill
            </h2>
          </div>
          <Suspense
            fallback={
              <div className="animate-pulse h-32 bg-neutral-100 dark:bg-neutral-800 rounded"></div>
            }
          >
            <BillForm onCreated={refresh} />
          </Suspense>
        </div>
      </div>

      {/* Saved searches */}
      <Suspense
        fallback={
          <div className="animate-pulse h-16 bg-neutral-100 dark:bg-neutral-800 rounded mb-4"></div>
        }
      >
        <SavedSearches
          currentFilters={filters}
          onApplySearch={handleFiltersChange}
          className="mb-4"
        />
      </Suspense>

      {/* Advanced filtering */}
      <Suspense
        fallback={
          <div className="animate-pulse h-24 bg-neutral-100 dark:bg-neutral-800 rounded mb-4"></div>
        }
      >
        <AdvancedFilterBar
          vendorOptions={vendorOptions}
          projectOptions={projectOptions}
          statusOptions={[
            { value: 'active', label: 'Active' },
            { value: 'pending_approval', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'paid', label: 'Paid' },
            { value: 'on_hold', label: 'On Hold' },
            { value: 'canceled', label: 'Canceled' },
          ]}
          showAdvanced={true}
          onFiltersChange={handleFiltersChange}
          className="mb-4"
        />
      </Suspense>

      {/* Select All Bar */}
      {isSelectMode && billCount > 0 && (
        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedBills.size === billCount && billCount > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 bg-white border-neutral-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Select all {billCount} bills
              </span>
            </label>
            {selectedBills.size > 0 && (
              <button
                onClick={exitSelectMode}
                className="px-3 py-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                Clear selection
              </button>
            )}
          </div>
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
            <svg
              className="h-6 w-6 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-4.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H6.75a1.125 1.125 0 0 1-1.125-1.125v-1.5A1.125 1.125 0 0 0 4.5 0.75H3.375c-.621 0-1.125.504-1.125 1.125v17.25a3.375 3.375 0 0 0 3.375 3.375h12.75a3.375 3.375 0 0 0 3.375-3.375V16.5a1.125 1.125 0 0 1 1.125-1.125Z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
            {isFiltered ? 'No bills match the current filter' : 'No bills yet'}
          </p>
          <p className="text-neutral-500 mb-6">
            {isFiltered
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first bill to get started with managing your expenses and payments.'}
          </p>
          {!filterContext && (
            <div className="flex items-center justify-center gap-2 text-neutral-600 dark:text-neutral-400 text-sm">
              <Plus className="h-4 w-4" />
              <p>Use the form above to add your first bill</p>
            </div>
          )}
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
                    {billCount}
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
                    {recurringBillCount}
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
                    {oneTimeBillCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {bills.length > 50
            ? // Virtual scrolling for large lists (>50 items)
              bills
                .slice(0, 50)
                .map((bill, index) => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    nextDue={nextDue[bill.id]}
                    onRefresh={refresh}
                    batchData={batchData}
                    isSelectMode={isSelectMode}
                    isSelected={selectedBills.has(bill.id)}
                    onSelect={() => handleSelectBill(bill.id)}
                    vendorOptions={vendorOptions}
                    projectOptions={projectOptions}
                    ref={index === 49 ? lastElementRef : null}
                  />
                ))
            : // Normal rendering for smaller lists
              bills.map((bill, index) => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  nextDue={nextDue[bill.id]}
                  onRefresh={refresh}
                  batchData={batchData}
                  isSelectMode={isSelectMode}
                  isSelected={selectedBills.has(bill.id)}
                  onSelect={() => handleSelectBill(bill.id)}
                  vendorOptions={vendorOptions}
                  projectOptions={projectOptions}
                  ref={index === bills.length - 1 ? lastElementRef : null}
                />
              ))}

          {/* Virtual scrolling notice for large lists */}
          {bills.length > 50 && (
            <div className="text-center py-2 text-xs text-neutral-500 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 mx-4">
              Showing first 50 bills for performance. Use filters to narrow
              results or load more with pagination.
            </div>
          )}

          {/* Loading indicator for infinite scroll */}
          {loading && headerData.billCount > 0 && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* End of results indicator */}
          {!hasMore && headerData.billCount > 0 && bills.length <= 50 && (
            <div className="text-center py-4 text-sm text-neutral-500">
              All bills loaded ({headerData.billCount} total)
            </div>
          )}

          {/* Empty state */}
          {bills.length === 0 && !loading && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                {isFiltered ? 'No bills match your filters' : 'No bills yet'}
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400">
                {isFiltered
                  ? 'Try adjusting your filters or clear them to see all bills.'
                  : 'Create your first bill to get started.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface BillCardProps {
  bill: BillRow;
  nextDue?: string;
  onRefresh: () => void;
  batchData: BillBatchData;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  vendorOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
}

const BillCard = memo(
  forwardRef<HTMLDivElement, BillCardProps>(function BillCard(
    {
      bill,
      nextDue,
      onRefresh,
      batchData,
      isSelectMode,
      isSelected,
      onSelect,
      vendorOptions,
      projectOptions,
    },
    ref
  ) {
    const supabase = getSupabaseClient();
    const [showDetails, setShowDetails] = useState(false);
    const [occurrences, setOccurrences] = useState<any[]>([]);
    const [occurrencesLoading, setOccurrencesLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isRecurring = !!bill.recurring_rule;
    const dueDate = bill.due_date || nextDue;

    // Get data from batch instead of individual API calls
    const occurrenceState = batchData.occurrenceStates.get(bill.id);
    const approverFromBatch = batchData.approverInfo.get(bill.id);
    const effectiveStatus = getEffectiveStatus(
      bill.status,
      occurrenceState || null
    );
    const statusInfo = getStatusInfo(effectiveStatus);

    // Use shared bill operations hook (but don't load data individually)
    const { loading, updateStatus, markAsPaid, deleteBill } = useBillOperations(
      bill.id,
      bill.status,
      isRecurring,
      onRefresh
    );

    // Handle delete with confirmation (optimized)
    const handleDelete = useCallback(async () => {
      if (!showDeleteConfirm) {
        setShowDeleteConfirm(true);
        return;
      }

      setIsDeleting(true);
      try {
        const success = await deleteBill();
        if (!success) {
          console.error('Failed to delete bill');
        }
      } finally {
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      }
    }, [showDeleteConfirm, deleteBill]);

    const loadOccurrences = useCallback(async () => {
      if (!isRecurring) return;

      setOccurrencesLoading(true);
      try {
        const { data } = await supabase
          .from('bill_occurrences')
          .select(
            `
          id,
          sequence,
          amount_due,
          due_date,
          state,
          approvals(
            approver_id,
            decided_at
          )
        `
          )
          .eq('bill_id', bill.id)
          .order('sequence')
          .limit(10);

        setOccurrences(data || []);
      } finally {
        setOccurrencesLoading(false);
      }
    }, [isRecurring, bill.id, supabase]);

    return (
      <div
        ref={ref}
        className={`bg-white dark:bg-neutral-900 border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${
          isRecurring
            ? 'border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700'
            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
        }`}
      >
        {/* Header */}
        <div
          className={`p-6 border-b ${
            isRecurring
              ? 'border-purple-100 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-950/20 dark:to-transparent'
              : 'border-neutral-100 dark:border-neutral-800'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {/* Selection Checkbox */}
                {isSelectMode && (
                  <input
                    type="checkbox"
                    checked={isSelected || false}
                    onChange={onSelect}
                    className="w-4 h-4 text-blue-600 bg-white border-neutral-300 rounded focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {bill.title}
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}
                >
                  <statusInfo.icon className="h-4 w-4" />
                  {statusInfo.label}
                </span>
                <div className="flex items-center gap-2">
                  {isRecurring ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-700 bg-purple-100 border border-purple-200 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-300">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Recurring Bill
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-green-700 bg-green-100 border border-green-200 dark:bg-green-900 dark:border-green-700 dark:text-green-300">
                      <Calendar className="h-3.5 w-3.5" />
                      One-time Bill
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mt-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-950 rounded-md">
                    <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                      Amount
                    </span>
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {bill.currency} ${bill.amount_total.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`p-1.5 rounded-md ${
                      isRecurring
                        ? 'bg-purple-50 dark:bg-purple-950'
                        : 'bg-green-50 dark:bg-green-950'
                    }`}
                  >
                    <Clock
                      className={`h-4 w-4 ${
                        isRecurring
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                      {isRecurring ? 'Next Due' : 'Due Date'}
                    </span>
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {dueDate ? new Date(dueDate).toLocaleDateString() : '—'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 dark:bg-amber-950 rounded-md">
                    <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                      Vendor
                    </span>
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {bill.vendor_name || '—'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-teal-50 dark:bg-teal-950 rounded-md">
                    <FolderOpen className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 block">
                      Project
                    </span>
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {bill.project_name || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {bill.description && (
                <div className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                  {bill.description}
                </div>
              )}

              {effectiveStatus === 'approved' &&
                approverFromBatch &&
                !isRecurring && (
                  <div className="mt-3 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Approved by {approverFromBatch}
                  </div>
                )}
            </div>

            <div className="ml-6 flex items-center gap-2">
              {/* Status actions for non-recurring bills */}
              {!isRecurring && effectiveStatus !== 'paid' && (
                <>
                  {effectiveStatus === 'active' && (
                    <button
                      onClick={() => updateStatus('pending_approval')}
                      disabled={loading}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FileText className="h-4 w-4" />
                      Submit
                    </button>
                  )}

                  {effectiveStatus === 'approved' && (
                    <button
                      onClick={markAsPaid}
                      disabled={loading}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Mark as Paid
                    </button>
                  )}

                  {effectiveStatus === 'pending_approval' && (
                    <button
                      onClick={() => updateStatus('approved')}
                      disabled={loading}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Approve
                    </button>
                  )}
                </>
              )}

              {/* Edit button (only show if not in select mode) */}
              {!isSelectMode && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                  </svg>
                  Edit Bill
                </button>
              )}

              {/* Delete button (only show if not in select mode) */}
              {!isSelectMode && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting || loading}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      showDeleteConfirm
                        ? 'text-white bg-red-600 hover:bg-red-700'
                        : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 border border-red-200 dark:border-red-800'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        Deleting...
                      </>
                    ) : showDeleteConfirm ? (
                      <>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                        Confirm Delete
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                        Delete
                      </>
                    )}
                  </button>

                  {/* Cancel delete button */}
                  {showDeleteConfirm && (
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      Cancel
                    </button>
                  )}
                </div>
              )}

              {/* View/Details toggle */}
              {!isSelectMode &&
                (isRecurring ? (
                  <button
                    onClick={() => {
                      if (!showDetails) loadOccurrences();
                      setShowDetails(!showDetails);
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg"
                  >
                    {showDetails ? 'Hide Details' : 'View Occurrences'}
                  </button>
                ) : (
                  <Link
                    href={`/bills/${bill.id}`}
                    className="px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg"
                  >
                    View Details
                  </Link>
                ))}
            </div>
          </div>
        </div>

        {/* Recurring bill occurrences */}
        {isRecurring && showDetails && (
          <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50">
            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">
              Recent Occurrences
            </h4>

            {loading ? (
              <div className="text-sm text-neutral-500">
                Loading occurrences...
              </div>
            ) : occurrences.length === 0 ? (
              <div className="text-sm text-neutral-500">
                No occurrences generated yet.
              </div>
            ) : (
              <div className="space-y-3">
                {occurrences.slice(0, 5).map((occ) => {
                  const occStatusInfo = getStatusInfo(occ.state);
                  const hasApproval = occ.approvals?.length > 0;

                  return (
                    <div
                      key={occ.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <div className="font-medium">#{occ.sequence}</div>
                          <div className="text-neutral-500">
                            {new Date(occ.due_date).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="text-sm">
                          <div className="font-medium">
                            ${occ.amount_due.toFixed(2)}
                          </div>
                          <div
                            className={`text-xs px-2 py-0.5 rounded-full ${occStatusInfo.color}`}
                          >
                            {occStatusInfo.label}
                          </div>
                        </div>

                        {occ.state === 'approved' && hasApproval && (
                          <div className="text-xs text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            Approved
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/bills/${bill.id}`}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View →
                      </Link>
                    </div>
                  );
                })}

                {occurrences.length > 5 && (
                  <div className="text-center">
                    <Link
                      href={`/bills/${bill.id}`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View all {occurrences.length} occurrences →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Edit form */}
        {isEditing && (
          <div className="border-t border-neutral-200 dark:border-neutral-800">
            <Suspense
              fallback={
                <div className="animate-pulse h-48 bg-neutral-100 dark:bg-neutral-800 rounded"></div>
              }
            >
              <BillEditForm
                bill={{
                  id: bill.id,
                  title: bill.title,
                  amount_total: bill.amount_total,
                  currency: bill.currency,
                  due_date: bill.due_date,
                  vendor_name: bill.vendor_name,
                  project_name: bill.project_name,
                  description: bill.description,
                  category: bill.category,
                  recurring_rule: bill.recurring_rule,
                  vendor_id: bill.vendor_id,
                  project_id: bill.project_id,
                }}
                vendorOptions={vendorOptions}
                projectOptions={projectOptions}
                onSaved={() => {
                  setIsEditing(false);
                  onRefresh();
                }}
                onCancel={() => setIsEditing(false)}
              />
            </Suspense>
          </div>
        )}
      </div>
    );
  })
);
