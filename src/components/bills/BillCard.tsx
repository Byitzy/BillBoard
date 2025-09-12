'use client';

import {
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FolderOpen,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { forwardRef, memo, useState, useCallback } from 'react';
import { useBillMutations } from '@/hooks/useBillMutations';
import { getEffectiveStatus, getStatusInfo } from '@/lib/bills/status';
import type { BillRow } from '@/hooks/usePaginatedBills';
import type { BillBatchData } from '@/hooks/useBillsBatch';

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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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

    // Use optimized mutations without individual queries
    const {
      updateStatus,
      markAsPaid,
      archiveBills,
      isUpdatingStatus,
      isMarkingAsPaid,
      isArchiving,
    } = useBillMutations();

    const loading = isUpdatingStatus || isMarkingAsPaid || isArchiving;

    // Optimized delete handler using archive
    const handleDelete = useCallback(async () => {
      if (!showDeleteConfirm) {
        setShowDeleteConfirm(true);
        return;
      }

      setIsDeleting(true);
      try {
        await archiveBills([bill.id]);
        onRefresh();
      } catch (error) {
        console.error('Failed to delete bill:', error);
      } finally {
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      }
    }, [showDeleteConfirm, archiveBills, bill.id, onRefresh]);

    return (
      <div
        ref={ref}
        className={`bg-white dark:bg-neutral-900 border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 ${
          isRecurring
            ? 'border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700'
            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
        }`}
      >
        <div
          className={`p-6 ${
            isRecurring
              ? 'bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-950/20 dark:to-transparent'
              : ''
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
                  <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
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
                      onClick={() =>
                        updateStatus({
                          billIds: [bill.id],
                          newStatus: 'pending_approval',
                        })
                      }
                      disabled={loading}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Submit
                    </button>
                  )}

                  {effectiveStatus === 'approved' && (
                    <button
                      onClick={() => markAsPaid([bill.id])}
                      disabled={loading}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Mark as Paid
                    </button>
                  )}

                  {effectiveStatus === 'pending_approval' && (
                    <button
                      onClick={() =>
                        updateStatus({
                          billIds: [bill.id],
                          newStatus: 'approved',
                        })
                      }
                      disabled={loading}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Approve
                    </button>
                  )}
                </>
              )}

              {/* Actions only show if not in select mode */}
              {!isSelectMode && (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/bills/${bill.id}`}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    Edit
                  </Link>

                  <button
                    onClick={handleDelete}
                    disabled={isDeleting || loading}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      showDeleteConfirm
                        ? 'text-white bg-red-600 hover:bg-red-700'
                        : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isDeleting
                      ? 'Deleting...'
                      : showDeleteConfirm
                        ? 'Confirm'
                        : 'Delete'}
                  </button>

                  {showDeleteConfirm && (
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  )}

                  <Link
                    href={`/bills/${bill.id}`}
                    className="px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    View
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  })
);

export default BillCard;
