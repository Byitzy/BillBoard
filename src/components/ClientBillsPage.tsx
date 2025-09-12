'use client';
import { Suspense, lazy } from 'react';
import BillsListPage from '@/components/bills/BillsListPage';
import type { BillRow } from '@/hooks/usePaginatedBills';

// Lazy load heavy components that aren't needed immediately
const BillForm = lazy(() => import('@/components/BillForm'));
const AdvancedFilterBar = lazy(
  () => import('@/components/ui/AdvancedFilterBar')
);
const SavedSearches = lazy(() => import('@/components/ui/SavedSearches'));

type ClientBillsPageProps = {
  initialBills: BillRow[];
  initialNextDue: Record<string, string | undefined>;
  initialError: string | null;
  initialFilterContext: string;
  vendorOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
  debugInfo?: any;
};

export default function ClientBillsPage({
  initialBills,
  initialNextDue,
  initialError,
  initialFilterContext,
  vendorOptions,
  projectOptions,
  debugInfo,
}: ClientBillsPageProps) {
  return (
    <div className="space-y-6">
      {/* Saved searches */}
      <Suspense
        fallback={
          <div className="animate-pulse h-16 bg-neutral-100 dark:bg-neutral-800 rounded mb-4"></div>
        }
      >
        <SavedSearches
          currentFilters={{}}
          onApplySearch={() => {}}
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
          onFiltersChange={() => {}}
          className="mb-4"
        />
      </Suspense>

      {/* Optimized Bills List */}
      <BillsListPage
        initialBills={initialBills}
        initialNextDue={initialNextDue}
        initialError={initialError}
        initialFilterContext={initialFilterContext}
        vendorOptions={vendorOptions}
        projectOptions={projectOptions}
        debugInfo={debugInfo}
      />
    </div>
  );
}
