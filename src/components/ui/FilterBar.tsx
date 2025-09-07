"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import SharedSelect from '@/components/ui/SharedSelect';
import { useLocale } from '@/components/i18n/LocaleProvider';

type FilterBarProps = {
  searchPlaceholder?: string;
  vendorOptions?: { id: string; name: string }[];
  projectOptions?: { id: string; name: string }[];
  statusOptions?: { value: string; label: string }[];
  showVendorFilter?: boolean;
  showProjectFilter?: boolean;
  showStatusFilter?: boolean;
  className?: string;
};

export default function FilterBar({
  searchPlaceholder = "Search...",
  vendorOptions = [],
  projectOptions = [],
  statusOptions = [],
  showVendorFilter = true,
  showProjectFilter = true,
  showStatusFilter = true,
  className = ""
}: FilterBarProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedVendor, setSelectedVendor] = useState<{ id: string; name: string } | null>(
    vendorOptions.find(v => v.id === searchParams.get('vendorId')) || null
  );
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string } | null>(
    projectOptions.find(p => p.id === searchParams.get('projectId')) || null
  );
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');

  // Update URL params when filters change (if using router)
  useEffect(() => {
    if (!router) return; // Skip if no router (for non-URL based filtering)
    
    const params = new URLSearchParams(searchParams);
    
    // Update search param
    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }
    
    // Update vendor param
    if (selectedVendor) {
      params.set('vendorId', selectedVendor.id);
    } else {
      params.delete('vendorId');
    }
    
    // Update project param
    if (selectedProject) {
      params.set('projectId', selectedProject.id);
    } else {
      params.delete('projectId');
    }
    
    // Update status param
    if (selectedStatus) {
      params.set('status', selectedStatus);
    } else {
      params.delete('status');
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(newUrl as any, { scroll: false });
  }, [search, selectedVendor, selectedProject, selectedStatus, router, searchParams]);

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setSelectedVendor(null);
    setSelectedProject(null);
    setSelectedStatus('');
  };

  const hasActiveFilters = search || selectedVendor || selectedProject || selectedStatus;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search input */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-900"
          />
        </div>

        {/* Vendor filter */}
        {showVendorFilter && vendorOptions.length > 0 && (
          <div className="min-w-[160px]">
            <label className="block text-xs text-neutral-500 mb-1">Vendor</label>
            <SharedSelect
              value={selectedVendor}
              onChange={setSelectedVendor}
              options={vendorOptions}
              placeholder="All vendors"
            />
          </div>
        )}

        {/* Project filter */}
        {showProjectFilter && projectOptions.length > 0 && (
          <div className="min-w-[160px]">
            <label className="block text-xs text-neutral-500 mb-1">Project</label>
            <SharedSelect
              value={selectedProject}
              onChange={setSelectedProject}
              options={projectOptions}
              placeholder="All projects"
            />
          </div>
        )}

        {/* Status filter */}
        {showStatusFilter && statusOptions.length > 0 && (
          <div className="min-w-[120px]">
            <label className="block text-xs text-neutral-500 mb-1">Status</label>
            <SharedSelect
              simple
              simpleValue={selectedStatus}
              onSimpleChange={setSelectedStatus}
              simpleOptions={[{ value: '', label: 'All statuses' }, ...statusOptions]}
            />
          </div>
        )}

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}