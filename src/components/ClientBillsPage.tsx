'use client';
import Link from 'next/link';
import { useState, useEffect, forwardRef, useMemo } from 'react';
import BillForm from '@/components/BillForm';
import CSVExportButton from '@/components/CSVExportButton';
import { RotateCcw, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import PDFExportButton from '@/components/PDFExportButton';
import AdvancedFilterBar from '@/components/ui/AdvancedFilterBar';
import SavedSearches from '@/components/ui/SavedSearches';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  getStatusInfo,
  getEffectiveStatus,
  getAllStatuses,
  type BillStatus,
} from '@/lib/bills/status';
import { useBillOperations } from '@/hooks/useBillOperations';
import {
  usePaginatedBills,
  type BillFilters,
  type BillRow,
} from '@/hooks/usePaginatedBills';
import { useBillsBatch, type BillBatchData } from '@/hooks/useBillsBatch';
import { useBulkBillOperations } from '@/hooks/useBulkBillOperations';
import BillEditForm from '@/components/bills/BillEditForm';

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
  const [nextDue, setNextDue] = useState<Record<string, string | undefined>>(
    {}
  );
  const [batchData, setBatchData] = useState<BillBatchData>({
    occurrenceStates: new Map(),
    approverInfo: new Map(),
    nextDueDates: {},
  });

  // Bulk selection state
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

  // Use batch operations hook for optimized queries
  const { loadBillsBatchData } = useBillsBatch();

  // Use bulk operations hook
  const {
    loading: bulkLoading,
    bulkUpdateStatus,
    bulkMarkAsPaid,
    bulkArchiveBills,
  } = useBulkBillOperations();

  // Memoize bill IDs to prevent unnecessary re-renders
  const billIds = useMemo(() => bills.map((b) => b.id), [bills]);

  // Initial load on mount only (no dependencies to prevent infinite loop)
  useEffect(() => {
    // Only refresh if we don't have any bills yet
    if (bills.length === 0 && !loading) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array for mount-only effect

  useEffect(() => {
    // Load batch data for all bills to avoid N+1 queries
    if (billIds.length > 0) {
      loadBillsBatchData(billIds)
        .then((data) => {
          setBatchData(data);
          setNextDue(data.nextDueDates);
        })
        .catch((err) => {
          console.error('Failed to load batch data:', err);
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

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedBills.size === bills.length) {
      setSelectedBills(new Set());
    } else {
      setSelectedBills(new Set(bills.map((b) => b.id)));
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
    let result;

    try {
      switch (action) {
        case 'approve':
          result = await bulkUpdateStatus(billIds, 'approved');
          break;
        case 'paid':
          result = await bulkMarkAsPaid(billIds);
          break;
        case 'hold':
          result = await bulkUpdateStatus(billIds, 'on_hold');
          break;
        case 'archive':
          result = await bulkArchiveBills(billIds);
          break;
        default:
          console.warn('Unknown bulk action:', action);
          return;
      }

      // Show success/error feedback
      if (result.success > 0) {
        console.log(`Successfully ${action}ed ${result.success} bills`);
      }
      if (result.failed > 0) {
        console.error(
          `Failed to ${action} ${result.failed} bills:`,
          result.errors
        );
      }

      // Clear selection and refresh data
      setSelectedBills(new Set());
      refresh();
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error);
    }
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedBills(new Set());
  };

  // Handle filter changes from saved searches
  const handleFiltersChange = (newFilters: any) => {
    // This will be handled by the AdvancedFilterBar component
    // through URL parameter updates, which will trigger a refresh
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">{t('bills.title')}</h1>
            {bills.length > 0 && (
              <button
                onClick={() => setIsSelectMode(!isSelectMode)}
                className="px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg"
              >
                {isSelectMode ? 'Cancel' : 'Select'}
              </button>
            )}
          </div>
          {filterContext && (
            <p className="text-sm text-neutral-500 mt-1">
              {filterContext} •{' '}
              <Link href="/bills" className="text-blue-600 hover:underline">
                Clear filter
              </Link>
            </p>
          )}
          {isSelectMode && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              {selectedBills.size} of {bills.length} bills selected
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk Actions Bar */}
          {isSelectMode && selectedBills.size > 0 && (
            <div className="flex items-center gap-2 mr-3 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <button
                onClick={() => handleBulkAction('approve')}
                disabled={bulkLoading}
                className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
              >
                {bulkLoading
                  ? 'Processing...'
                  : `Approve ${selectedBills.size}`}
              </button>
              <button
                onClick={() => handleBulkAction('paid')}
                disabled={bulkLoading}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
              >
                {bulkLoading ? 'Processing...' : 'Mark Paid'}
              </button>
              <button
                onClick={() => handleBulkAction('hold')}
                disabled={bulkLoading}
                className="px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
              >
                {bulkLoading ? 'Processing...' : 'Put on Hold'}
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                disabled={bulkLoading}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
              >
                {bulkLoading ? 'Processing...' : 'Archive'}
              </button>
            </div>
          )}
          {bills.length > 0 && (
            <>
              <CSVExportButton
                type="data"
                data={bills.map((b) => ({
                  Title: b.title,
                  Vendor: b.vendor_name ?? '—',
                  Project: b.project_name ?? '—',
                  Amount: `${b.currency} $${b.amount_total.toFixed(2)}`,
                  'Due Date': b.due_date ?? nextDue[b.id] ?? '—',
                  Status: getStatusInfo(b.status as BillStatus).label,
                  Type: b.recurring_rule ? 'Recurring' : 'One-time',
                  Category: b.category ?? '—',
                }))}
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
                className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              />
              <PDFExportButton
                type="data"
                data={bills.map((b) => ({
                  Title: b.title,
                  Vendor: b.vendor_name ?? '—',
                  Project: b.project_name ?? '—',
                  Amount: `${b.currency} $${b.amount_total.toFixed(2)}`,
                  'Due Date': b.due_date ?? nextDue[b.id] ?? '—',
                  Status: getStatusInfo(b.status as BillStatus).label,
                  Type: b.recurring_rule ? 'Recurring' : 'One-time',
                  Category: b.category ?? '—',
                }))}
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
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              />
            </>
          )}
          <button
            onClick={refresh}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <BillForm onCreated={refresh} />

      {/* Saved searches */}
      <SavedSearches
        currentFilters={filters}
        onApplySearch={handleFiltersChange}
        className="mb-4"
      />

      {/* Advanced filtering */}
      <AdvancedFilterBar
        vendorOptions={vendorOptions}
        projectOptions={projectOptions}
        statusOptions={[
          { value: 'active', label: 'Active' },
          { value: 'pending_approval', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'paid', label: 'Paid' },
          { value: 'on_hold', label: 'On Hold' },
        ]}
        showAdvanced={true}
        onFiltersChange={handleFiltersChange}
        className="mb-4"
      />

      {/* Select All Bar */}
      {isSelectMode && bills.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedBills.size === bills.length && bills.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 text-blue-600 bg-white border-neutral-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Select all {bills.length} bills
            </span>
          </label>
          {selectedBills.size > 0 && (
            <button
              onClick={exitSelectMode}
              className="ml-auto text-sm text-neutral-500 hover:text-neutral-700"
            >
              Clear selection
            </button>
          )}
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="text-center py-12">
          <div className="text-lg font-medium text-neutral-600 dark:text-neutral-400">
            {t('common.loading')}
          </div>
        </div>
      ) : bills.length === 0 ? (
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
            {filterContext
              ? 'No bills match the current filter'
              : 'No bills yet'}
          </p>
          <p className="text-neutral-500 mb-6">
            {filterContext
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first bill to get started with managing your expenses and payments.'}
          </p>
          {!filterContext && (
            <div className="text-neutral-600 text-sm">
              <p>👇 Use the form below to add your first bill</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {bills.map((bill, index) => (
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

          {/* Loading indicator for infinite scroll */}
          {loading && bills.length > 0 && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* End of results indicator */}
          {!hasMore && bills.length > 0 && (
            <div className="text-center py-4 text-sm text-neutral-500">
              All bills loaded ({bills.length} total)
            </div>
          )}

          {/* Empty state */}
          {isEmpty && !loading && (
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

const BillCard = forwardRef<HTMLDivElement, BillCardProps>(function BillCard(
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
  const { loading, updateStatus, markAsPaid } = useBillOperations(
    bill.id,
    bill.status,
    isRecurring,
    onRefresh
  );

  async function loadOccurrences() {
    if (!isRecurring) return;

    setOccurrencesLoading(true);
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
    setOccurrencesLoading(false);
  }

  return (
    <div
      ref={ref}
      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
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
              {isRecurring && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800">
                  <RotateCcw className="h-4 w-4" />
                  Recurring
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  Amount
                </span>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">
                  {bill.currency} ${bill.amount_total.toFixed(2)}
                </div>
              </div>

              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  {isRecurring ? 'Next Due' : 'Due Date'}
                </span>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">
                  {dueDate ? new Date(dueDate).toLocaleDateString() : '—'}
                </div>
              </div>

              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  Vendor
                </span>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">
                  {bill.vendor_name || '—'}
                </div>
              </div>

              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  Project
                </span>
                <div className="font-medium text-neutral-900 dark:text-neutral-100">
                  {bill.project_name || '—'}
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
                className="px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg"
              >
                Edit
              </button>
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
        </div>
      )}
    </div>
  );
});
