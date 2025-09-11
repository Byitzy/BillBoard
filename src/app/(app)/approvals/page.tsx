'use client';

// Disable caching to ensure fresh data
export const dynamic = 'force-dynamic';

import {
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  FileText,
  Calendar,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ApprovalPanel from '@/components/ApprovalPanel';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { getSupabaseClient } from '@/lib/supabase/client';

type BillOccurrenceWithBill = any;

interface ApprovalSummary {
  approved: number;
  pending: number;
  onHold: number;
  rejected: number;
}

export default function ApprovalsPage() {
  const [billOccurrences, setBillOccurrences] = useState<
    BillOccurrenceWithBill[]
  >([]);
  const [filteredOccurrences, setFilteredOccurrences] = useState<
    BillOccurrenceWithBill[]
  >([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [summary, setSummary] = useState<ApprovalSummary>({
    approved: 0,
    pending: 0,
    onHold: 0,
    rejected: 0,
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = getSupabaseClient();

  const {
    execute: fetchData,
    loading,
    error,
  } = useAsyncOperation<BillOccurrenceWithBill[]>();

  useEffect(() => {
    loadData();
    getCurrentUser();
  }, []);

  useEffect(() => {
    filterOccurrences();
  }, [billOccurrences, statusFilter]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadData = async () => {
    const result = await fetchData(async () => {
      // Force fresh data by clearing any potential Supabase caching
      const { data, error } = await supabase
        .from('bill_occurrences')
        .select(
          `
          *,
          bills (
            *,
            vendors (*)
          )
        `
        )
        .in('state', ['pending_approval', 'approved', 'on_hold'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    });

    if (result.success) {
      setBillOccurrences(result.data);
      calculateSummary(result.data);
    }
  };

  const calculateSummary = (occurrences: BillOccurrenceWithBill[]) => {
    const summary = occurrences.reduce(
      (acc, occurrence) => {
        if (occurrence.state === 'approved') {
          acc.approved += 1;
        } else if (occurrence.state === 'pending_approval') {
          acc.pending += 1;
        } else if (occurrence.state === 'on_hold') {
          acc.onHold += 1;
        }
        return acc;
      },
      { approved: 0, pending: 0, onHold: 0, rejected: 0 } as ApprovalSummary
    );

    setSummary({
      approved: summary.approved,
      pending: summary.pending,
      onHold: summary.onHold,
      rejected: summary.rejected,
    });
  };

  const filterOccurrences = () => {
    if (statusFilter === 'all') {
      setFilteredOccurrences(billOccurrences);
    } else {
      const filtered = billOccurrences.filter((occurrence) => {
        if (statusFilter === 'on_hold') return occurrence.state === 'on_hold';
        if (statusFilter === 'pending')
          return occurrence.state === 'pending_approval';
        return occurrence.state === statusFilter;
      });
      setFilteredOccurrences(filtered);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'pending':
      case 'pending_approval':
        return <Clock className="h-4 w-4 text-amber-600" />;
      case 'on_hold':
        return <Clock className="h-4 w-4 text-amber-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-neutral-600" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'pending':
      case 'pending_approval':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'on_hold':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && billOccurrences.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Bill Approvals
          </h1>
        </div>
        <SkeletonTable rows={8} cols={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Bill Approvals
          </h1>
        </div>
        <ErrorDisplay error={error} onRetry={loadData} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Bill Approvals
        </h1>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-medium text-emerald-900">Approved</h3>
          </div>
          <p className="mt-2 text-2xl font-semibold text-emerald-900">
            {summary.approved}
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            <h3 className="text-sm font-medium text-amber-900">Pending</h3>
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-900">
            {summary.pending}
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            <h3 className="text-sm font-medium text-amber-900">On Hold</h3>
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-900">
            {summary.onHold}
          </p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-medium text-red-900">Rejected</h3>
          </div>
          <p className="mt-2 text-2xl font-semibold text-red-900">
            {summary.rejected}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="pending_approval">Pending</option>
          <option value="approved">Approved</option>
          <option value="on_hold">On Hold</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Bill Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {filteredOccurrences.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12">
                    <div className="text-center">
                      <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-neutral-400" />
                      </div>
                      <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                        {statusFilter === 'all' && billOccurrences.length === 0
                          ? 'No bills require approval yet'
                          : 'No bills found for the selected filter'}
                      </p>
                      <p className="text-neutral-500 mb-6">
                        {statusFilter === 'all' && billOccurrences.length === 0
                          ? 'Bill occurrences will appear here when bills are created and scheduled for payment. Start by creating some bills to see approval items.'
                          : 'Try adjusting your filter criteria or creating more bills to see approval items.'}
                      </p>
                      {statusFilter === 'all' &&
                        billOccurrences.length === 0 && (
                          <div className="space-y-3">
                            <Link
                              href="/bills"
                              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
                            >
                              <FileText className="h-4 w-4" />
                              Create Bills
                            </Link>
                            <p className="text-sm text-neutral-600">
                              Bills with due dates will automatically create
                              occurrences for approval
                            </p>
                          </div>
                        )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOccurrences.map((occurrence) => (
                  <tr key={occurrence.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-neutral-400" />
                            <p className="text-sm font-medium text-neutral-900">
                              {occurrence.bills.title}
                            </p>
                          </div>
                          <p className="text-sm text-neutral-500">
                            {occurrence.bills.vendors.name}
                          </p>
                          {occurrence.bills.description && (
                            <p className="mt-1 text-xs text-neutral-400">
                              {occurrence.bills.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-neutral-400" />
                        <time
                          dateTime={occurrence.due_date}
                          className={`${
                            new Date(occurrence.due_date) < new Date()
                              ? 'text-red-600 font-medium'
                              : 'text-neutral-900'
                          }`}
                        >
                          {formatDate(occurrence.due_date)}
                        </time>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-neutral-900">
                        {formatCurrency(occurrence.amount_due)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(
                          occurrence.state
                        )}`}
                      >
                        {getStatusIcon(occurrence.state)}
                        {occurrence.state === 'on_hold'
                          ? 'On Hold'
                          : occurrence.state === 'pending_approval'
                            ? 'Pending'
                            : occurrence.state}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            router.push(`/bills/${occurrence.bills.id}`)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filteredOccurrences.length > 0 && currentUserId && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-neutral-900">
            Quick Approvals
          </h3>
          <div className="space-y-6">
            {filteredOccurrences
              .filter((occurrence) => occurrence.state === 'pending_approval')
              .slice(0, 3)
              .map((occurrence) => (
                <div
                  key={occurrence.id}
                  className="rounded-lg border border-neutral-200 bg-white p-4"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-neutral-900">
                          {occurrence.bills.title}
                        </h4>
                        <p className="text-sm text-neutral-600">
                          {occurrence.bills.vendors.name} • Due{' '}
                          {formatDate(occurrence.due_date)}
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-neutral-900">
                        {formatCurrency(occurrence.amount_due)}
                      </p>
                    </div>

                    <ApprovalPanel
                      billOccurrenceId={occurrence.id}
                      currentUserId={currentUserId}
                      showHistory={false}
                      compact={false}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
