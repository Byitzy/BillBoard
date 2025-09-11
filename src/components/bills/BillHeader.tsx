'use client';
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

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

// Helper function to get status color and icon (reused from ClientBillsPage)
function getStatusInfo(status: string) {
  switch (status) {
    case 'pending_approval':
      return {
        color:
          'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
        icon: '⏳',
        label: 'Pending Approval',
      };
    case 'approved':
      return {
        color:
          'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
        icon: '✅',
        label: 'Approved',
      };
    case 'paid':
      return {
        color:
          'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
        icon: '💳',
        label: 'Paid',
      };
    case 'on_hold':
      return {
        color:
          'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
        icon: '⏸️',
        label: 'On Hold',
      };
    default:
      return {
        color:
          'text-neutral-600 bg-neutral-50 border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800',
        icon: '📄',
        label: status.charAt(0).toUpperCase() + status.slice(1),
      };
  }
}

export default function BillHeader({ bill, error }: BillHeaderProps) {
  const supabase = getSupabaseClient();
  const [billOccurrenceState, setBillOccurrenceState] = useState<string | null>(
    null
  );
  const [approver, setApprover] = useState<string | null>(null);

  const isRecurring = bill ? !!bill.recurring_rule : false;

  // For non-recurring bills, show the actual occurrence state, otherwise show bill status
  const displayStatus =
    bill && !isRecurring && billOccurrenceState
      ? billOccurrenceState
      : bill?.status || 'active';
  const statusInfo = getStatusInfo(displayStatus);

  useEffect(() => {
    if (bill && !isRecurring) {
      loadBillOccurrenceState();
    }
  }, [bill?.id, isRecurring]);

  useEffect(() => {
    if (bill && displayStatus === 'approved' && !isRecurring) {
      loadApproverInfo();
    }
  }, [bill?.id, displayStatus, isRecurring]);

  async function loadBillOccurrenceState() {
    if (!bill) return;

    try {
      const { data, error } = await supabase
        .from('bill_occurrences')
        .select('state')
        .eq('bill_id', bill.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading bill occurrence state:', error);
        return;
      }

      if (data?.[0]) {
        console.log(`Bill ${bill.id} occurrence state:`, data[0].state);
        setBillOccurrenceState(data[0].state);
      } else {
        console.log(`No bill occurrence found for bill ${bill.id}`);
      }
    } catch (error) {
      console.error('Failed to load bill occurrence state:', error);
    }
  }

  async function loadApproverInfo() {
    if (!bill) return;

    const { data } = await supabase
      .from('bill_occurrences')
      .select(
        `
        id,
        approvals!inner(
          approver_id,
          decided_at
        )
      `
      )
      .eq('bill_id', bill.id)
      .eq('state', 'approved')
      .limit(1);

    if (data?.[0]?.approvals?.[0]) {
      setApprover('Admin'); // Simplified for now
    }
  }

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

            {displayStatus === 'approved' && approver && !isRecurring && (
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
