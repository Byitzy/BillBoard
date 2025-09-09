'use client';

import SharedSelect from '@/components/ui/SharedSelect';

interface MemberFiltersProps {
  roleFilter: string;
  statusFilter: string;
  searchTerm: string;
  onRoleFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSearchTermChange: (value: string) => void;
}

const ROLE_LABELS = {
  admin: 'Admin',
  approver: 'Approver',
  accountant: 'Accountant',
  data_entry: 'Data Entry',
  analyst: 'Analyst',
  viewer: 'Viewer',
};

const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

export default function MemberFilters({
  roleFilter,
  statusFilter,
  searchTerm,
  onRoleFilterChange,
  onStatusFilterChange,
  onSearchTermChange,
}: MemberFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search members..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          <SharedSelect
            simple
            simpleValue={roleFilter}
            onSimpleChange={onRoleFilterChange}
            simpleOptions={[
              { value: '', label: 'All Roles' },
              ...Object.entries(ROLE_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
            className="min-w-[120px]"
          />
          <SharedSelect
            simple
            simpleValue={statusFilter}
            onSimpleChange={onStatusFilterChange}
            simpleOptions={[
              { value: '', label: 'All Status' },
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            ]}
            className="min-w-[120px]"
          />
        </div>
      </div>
    </div>
  );
}
