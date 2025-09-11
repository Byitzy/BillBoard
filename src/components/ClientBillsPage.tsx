'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import BillForm from '@/components/BillForm';
import CSVExportButton from '@/components/CSVExportButton';
import { useLocale } from '@/components/i18n/LocaleProvider';
import PDFExportButton from '@/components/PDFExportButton';
import FilterBar from '@/components/ui/FilterBar';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';

type BillRow = {
  id: string;
  title: string;
  amount_total: number;
  due_date: string | null;
  vendor_name: string | null;
  project_name: string | null;
  status: string;
  recurring_rule: any | null;
  created_at: string;
  currency: string;
  description: string | null;
  category: string | null;
};

type ClientBillsPageProps = {
  initialBills: BillRow[];
  initialNextDue: Record<string, string | undefined>;
  initialError: string | null;
  filterContext: string;
  vendorOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
};

export default function ClientBillsPage({
  initialBills,
  initialNextDue,
  initialError,
  filterContext,
  vendorOptions,
  projectOptions,
}: ClientBillsPageProps) {
  const supabase = getSupabaseClient();
  const { t } = useLocale();
  const [bills, setBills] = useState<BillRow[]>(initialBills);
  const [nextDue, setNextDue] =
    useState<Record<string, string | undefined>>(initialNextDue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  // Reload data when component mounts to ensure fresh data
  useEffect(() => {
    // Always reload on mount to ensure we have the latest data
    // This fixes the issue where existing bills don't show until a new one is added
    reload();
  }, []);

  async function reload() {
    setLoading(true);
    setError(null);
    const orgId = await getDefaultOrgId(supabase);
    if (!orgId) {
      setError('No organization found.');
      setLoading(false);
      return;
    }

    // Get current URL search params to maintain filters
    const urlParams = new URLSearchParams(window.location.search);

    // Force fresh data by adding a timestamp to prevent caching
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
        vendors(name),
        projects(name)
      `
      )
      .eq('org_id', orgId);

    // Apply same filters as server-side
    const vendorId = urlParams.get('vendorId');
    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }
    const projectId = urlParams.get('projectId');
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    // Apply status filter - default to 'active' if no status specified
    const status = urlParams.get('status') || 'active';
    query = query.eq('status', status);

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) setError(error.message);
    else {
      const rows = (data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        amount_total: row.amount_total,
        due_date: row.due_date,
        vendor_name: row.vendors?.name || null,
        project_name: row.projects?.name || null,
        status: row.status,
        recurring_rule: row.recurring_rule,
        created_at: row.created_at,
        currency: row.currency,
        description: row.description,
        category: row.category,
      })) as BillRow[];
      // Apply client-side search filter (same as server-side)
      let filteredRows = rows;
      if (urlParams.get('search')) {
        const searchLower = urlParams.get('search')!.toLowerCase();
        filteredRows = rows.filter(
          (bill) =>
            bill.title.toLowerCase().includes(searchLower) ||
            (bill.vendor_name &&
              bill.vendor_name.toLowerCase().includes(searchLower)) ||
            (bill.project_name &&
              bill.project_name.toLowerCase().includes(searchLower))
        );
      }

      setBills(filteredRows);

      // compute next due for recurring bills
      const ids = rows.filter((b) => !b.due_date).map((b) => b.id);
      if (ids.length > 0) {
        const today = new Date();
        const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const { data: occ } = await supabase
          .from('bill_occurrences')
          .select('bill_id,due_date')
          .in('bill_id', ids)
          .gte('due_date', iso)
          .order('due_date', { ascending: true });
        const map: Record<string, string> = {};
        occ?.forEach((o: any) => {
          if (!map[o.bill_id]) map[o.bill_id] = o.due_date;
        });
        setNextDue(map);
      } else {
        setNextDue({});
      }
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t('bills.title')}</h1>
          {filterContext && (
            <p className="text-sm text-neutral-500 mt-1">
              {filterContext} •{' '}
              <Link href="/bills" className="text-blue-600 hover:underline">
                Clear filter
              </Link>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
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
                  Status: getStatusInfo(b.status).label,
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
                  Status: getStatusInfo(b.status).label,
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
            onClick={reload}
            className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <BillForm onCreated={reload} />

      <FilterBar
        searchPlaceholder="Search bills by title, vendor, or project..."
        vendorOptions={vendorOptions}
        projectOptions={projectOptions}
        statusOptions={[
          { value: 'active', label: 'Active' },
          { value: 'pending_approval', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'paid', label: 'Paid' },
          { value: 'on_hold', label: 'On Hold' },
        ]}
        className="my-4"
      />

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
          {bills.map((bill) => (
            <BillCard
              key={bill.id}
              bill={bill}
              nextDue={nextDue[bill.id]}
              onRefresh={reload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to get status color and icon
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

interface BillCardProps {
  bill: BillRow;
  nextDue?: string;
  onRefresh: () => void;
}

function BillCard({ bill, nextDue, onRefresh }: BillCardProps) {
  const supabase = getSupabaseClient();
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approver, setApprover] = useState<string | null>(null);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [billOccurrenceState, setBillOccurrenceState] = useState<string | null>(
    null
  );

  const isRecurring = !!bill.recurring_rule;
  const dueDate = bill.due_date || nextDue;

  // For non-recurring bills, show the actual occurrence state, otherwise show bill status
  const displayStatus =
    !isRecurring && billOccurrenceState ? billOccurrenceState : bill.status;
  const statusInfo = getStatusInfo(displayStatus);

  // Load bill occurrence state for non-recurring bills
  useEffect(() => {
    if (!isRecurring) {
      loadBillOccurrenceState();
    }
  }, [bill.id, isRecurring]);

  // Load approver info for approved bills
  useEffect(() => {
    if (displayStatus === 'approved' && !isRecurring) {
      loadApproverInfo();
    }
  }, [displayStatus, bill.id, isRecurring]);

  async function loadBillOccurrenceState() {
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
      // For now, just show that it was approved
      // In production, you'd want to join with a users table that's accessible
      setApprover('Admin');
    }
  }

  async function loadOccurrences() {
    if (!isRecurring) return;

    setLoading(true);
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
    setLoading(false);
  }

  async function markAsPaid() {
    if (isRecurring) return;

    setLoading(true);
    try {
      // For one-time bills, update all bill occurrences to paid
      await supabase
        .from('bill_occurrences')
        .update({ state: 'paid' })
        .eq('bill_id', bill.id);

      onRefresh();
    } catch (error) {
      console.error('Failed to mark as paid:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(
    newStatus:
      | 'active'
      | 'pending_approval'
      | 'approved'
      | 'on_hold'
      | 'canceled'
  ) {
    setLoading(true);
    try {
      await supabase
        .from('bills')
        .update({ status: newStatus })
        .eq('id', bill.id);

      onRefresh();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                {bill.title}
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}
              >
                <span>{statusInfo.icon}</span>
                {statusInfo.label}
              </span>
              {isRecurring && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800">
                  🔄 Recurring
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

            {displayStatus === 'approved' && approver && !isRecurring && (
              <div className="mt-3 text-sm text-green-600 dark:text-green-400">
                ✅ Approved by {approver}
              </div>
            )}
          </div>

          <div className="ml-6 flex items-center gap-2">
            {/* Status actions for non-recurring bills */}
            {!isRecurring && displayStatus !== 'paid' && (
              <>
                {displayStatus === 'approved' && (
                  <button
                    onClick={markAsPaid}
                    disabled={loading}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Mark as Paid
                  </button>
                )}

                {displayStatus === 'pending_approval' && (
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

            {/* View/Details toggle */}
            {isRecurring ? (
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
            )}
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
                          ✅ Approved
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
    </div>
  );
}
