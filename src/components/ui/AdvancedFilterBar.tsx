'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SharedSelect from '@/components/ui/SharedSelect';

interface AdvancedFilterBarProps {
  vendorOptions?: { id: string; name: string }[];
  projectOptions?: { id: string; name: string }[];
  statusOptions?: { value: string; label: string }[];
  currencyOptions?: { value: string; label: string }[];
  showAdvanced?: boolean;
  onFiltersChange?: (filters: any) => void;
  className?: string;
}

export default function AdvancedFilterBar({
  vendorOptions = [],
  projectOptions = [],
  statusOptions = [],
  currencyOptions = [
    { value: 'CAD', label: 'CAD' },
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
  ],
  showAdvanced = false,
  onFiltersChange,
  className = '',
}: AdvancedFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Basic filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedVendor, setSelectedVendor] = useState<{
    id: string;
    name: string;
  } | null>(
    vendorOptions.find((v) => v.id === searchParams.get('vendorId')) || null
  );
  const [selectedProject, setSelectedProject] = useState<{
    id: string;
    name: string;
  } | null>(
    projectOptions.find((p) => p.id === searchParams.get('projectId')) || null
  );
  const [selectedStatus, setSelectedStatus] = useState(
    searchParams.get('status') || ''
  );

  // Advanced filters
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');
  const [amountMin, setAmountMin] = useState(
    searchParams.get('amountMin') || ''
  );
  const [amountMax, setAmountMax] = useState(
    searchParams.get('amountMax') || ''
  );
  const [selectedCurrency, setSelectedCurrency] = useState(
    searchParams.get('currency') || ''
  );
  const [category, setCategory] = useState(searchParams.get('category') || '');

  // Apply filters function
  const applyFilters = () => {
    const filters = {
      search: search || undefined,
      vendorId: selectedVendor?.id || undefined,
      projectId: selectedProject?.id || undefined,
      status: selectedStatus || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      amountMin: amountMin ? parseFloat(amountMin) : undefined,
      amountMax: amountMax ? parseFloat(amountMax) : undefined,
      currency: selectedCurrency || undefined,
      category: category || undefined,
    };

    // Update URL params if using router
    if (router) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.set(key, String(value));
        }
      });
      const newUrl = params.toString() ? `?${params.toString()}` : '';
      router.replace(newUrl as any, { scroll: false });
    }

    // Call the callback if provided
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setSelectedVendor(null);
    setSelectedProject(null);
    setSelectedStatus('');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setSelectedCurrency('');
    setCategory('');

    // Clear URL params
    if (router) {
      router.replace(window.location.pathname as any, { scroll: false });
    }

    // Call the callback with empty filters
    if (onFiltersChange) {
      onFiltersChange({});
    }
  };

  const hasActiveFilters =
    search ||
    selectedVendor ||
    selectedProject ||
    selectedStatus ||
    dateFrom ||
    dateTo ||
    amountMin ||
    amountMax ||
    selectedCurrency ||
    category;

  const hasAdvancedFilters =
    dateFrom ||
    dateTo ||
    amountMin ||
    amountMax ||
    selectedCurrency ||
    category;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Basic filters */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search input */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search bills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
          />
        </div>

        {/* Vendor filter */}
        {vendorOptions.length > 0 && (
          <div className="min-w-[160px]">
            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Vendor
            </label>
            <SharedSelect
              value={selectedVendor}
              onChange={setSelectedVendor}
              options={vendorOptions}
              placeholder="All vendors"
            />
          </div>
        )}

        {/* Project filter */}
        {projectOptions.length > 0 && (
          <div className="min-w-[160px]">
            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Project
            </label>
            <SharedSelect
              value={selectedProject}
              onChange={setSelectedProject}
              options={projectOptions}
              placeholder="All projects"
            />
          </div>
        )}

        {/* Status filter */}
        {statusOptions.length > 0 && (
          <div className="min-w-[120px]">
            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Status
            </label>
            <SharedSelect
              simple
              simpleValue={selectedStatus}
              onSimpleChange={setSelectedStatus}
              simpleOptions={[
                { value: '', label: 'All statuses' },
                ...statusOptions,
              ]}
            />
          </div>
        )}

        {/* Advanced filters toggle */}
        {showAdvanced && (
          <button
            onClick={() => setShowAdvancedPanel(!showAdvancedPanel)}
            className={`px-3 py-2 text-sm font-medium border rounded-xl ${
              hasAdvancedFilters || showAdvancedPanel
                ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900'
            }`}
          >
            {showAdvancedPanel ? 'Hide Advanced' : 'Advanced'}
            {hasAdvancedFilters && !showAdvancedPanel && (
              <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
            )}
          </button>
        )}

        {/* Apply filters button */}
        <button
          onClick={applyFilters}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
        >
          Apply Filters
        </button>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-xl"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Advanced filters panel */}
      {showAdvanced && showAdvancedPanel && (
        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
            Advanced Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date range */}
            <div className="space-y-2">
              <label className="block text-xs text-neutral-500 dark:text-neutral-400">
                Date Range
              </label>
              <div className="space-y-1">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  placeholder="From date"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  placeholder="To date"
                />
              </div>
            </div>

            {/* Amount range */}
            <div className="space-y-2">
              <label className="block text-xs text-neutral-500 dark:text-neutral-400">
                Amount Range
              </label>
              <div className="space-y-1">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  placeholder="Minimum amount"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  placeholder="Maximum amount"
                />
              </div>
            </div>

            {/* Currency & Category */}
            <div className="space-y-3">
              {/* Currency filter */}
              <div>
                <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  Currency
                </label>
                <SharedSelect
                  simple
                  simpleValue={selectedCurrency}
                  onSimpleChange={setSelectedCurrency}
                  simpleOptions={[
                    { value: '', label: 'All currencies' },
                    ...currencyOptions,
                  ]}
                />
              </div>

              {/* Category filter */}
              <div>
                <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  placeholder="Filter by category"
                />
              </div>
            </div>
          </div>

          {/* Advanced panel actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => setShowAdvancedPanel(false)}
              className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
            >
              Close
            </button>
            <button
              onClick={applyFilters}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Apply Advanced Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
