'use client';
import { useEffect } from 'react';
import { getStatusInfo } from '@/lib/bills/status';
import { useBillOperations } from '@/hooks/useBillOperations';

interface Bill {
  id: string;
  title: string;
  amount_total: number;
  currency?: string;
  due_date: string | null;
  recurring_rule?: any | null;
  status: string;
  description: string | null;
  category: string | null;
  vendor_name: string | null;
  project_name: string | null;
  created_at: string;
}

interface BillHeaderProps {
  bill: Bill | null;
  error: string | null;
}

export default function BillHeader({ bill, error }: BillHeaderProps) {
  const isRecurring = bill ? !!bill.recurring_rule : false;

  // Use shared bill operations hook
  const {
    effectiveStatus,
    approver,
    loadBillOccurrenceState,
    loadApproverInfo,
  } = useBillOperations(bill?.id || '', bill?.status || 'active', isRecurring);

  const statusInfo = getStatusInfo(effectiveStatus);

  useEffect(() => {
    if (bill) {
      loadBillOccurrenceState();
    }
  }, [bill?.id, loadBillOccurrenceState]);

  useEffect(() => {
    if (bill && effectiveStatus === 'approved') {
      loadApproverInfo();
    }
  }, [bill?.id, effectiveStatus, loadApproverInfo]);

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <div className="text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {bill.title}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${statusInfo.color}`}
              >
                <span>{statusInfo.icon}</span>
                {statusInfo.label}
              </span>
              {isRecurring && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800">
                  🔄 Recurring
                </span>
              )}
            </div>

            {bill.description && (
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                {bill.description}
              </p>
            )}

            {effectiveStatus === 'approved' && approver && (
              <div className="mb-4 text-sm text-green-600 dark:text-green-400">
                ✅ Approved by {approver}
              </div>
            )}
          </div>
        </div>

        {/* Key Information Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Total Amount
            </div>
            <div className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {bill.currency || 'CAD'} ${bill.amount_total.toFixed(2)}
            </div>
          </div>

          <div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              {isRecurring ? 'Schedule' : 'Due Date'}
            </div>
            <div className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              {bill.due_date
                ? new Date(bill.due_date).toLocaleDateString()
                : isRecurring
                  ? 'Recurring'
                  : '—'}
            </div>
          </div>

          <div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Vendor
            </div>
            <div className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              {bill.vendor_name || '—'}
            </div>
          </div>

          <div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
              Project
            </div>
            <div className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              {bill.project_name || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50 rounded-b-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-neutral-500 dark:text-neutral-400">
              Created:
            </span>
            <span className="ml-2 text-neutral-900 dark:text-neutral-100">
              {new Date(bill.created_at).toLocaleDateString()}
            </span>
          </div>

          {bill.category && (
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">
                Category:
              </span>
              <span className="ml-2 text-neutral-900 dark:text-neutral-100">
                {bill.category}
              </span>
            </div>
          )}

          <div>
            <span className="text-neutral-500 dark:text-neutral-400">
              Type:
            </span>
            <span className="ml-2 text-neutral-900 dark:text-neutral-100">
              {isRecurring ? 'Recurring Bill' : 'One-time Bill'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
