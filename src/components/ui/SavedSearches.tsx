'use client';
import { useState } from 'react';
import {
  useSavedSearches,
  type SavedSearch,
  type CreateSavedSearchData,
} from '@/hooks/useSavedSearches';
import { type BillFilters } from '@/hooks/usePaginatedBills';
import SharedSelect from './SharedSelect';

interface SavedSearchesProps {
  currentFilters: BillFilters;
  onApplySearch: (filters: BillFilters) => void;
  className?: string;
}

export default function SavedSearches({
  currentFilters,
  onApplySearch,
  className = '',
}: SavedSearchesProps) {
  const {
    savedSearches,
    loading,
    createSavedSearch,
    updateSavedSearch,
    deleteSavedSearch,
    setAsDefault,
  } = useSavedSearches();

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingSearch, setEditingSearch] = useState<SavedSearch | null>(null);
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: '',
    is_default: false,
  });

  // Check if current filters have any active filters
  const hasActiveFilters = Object.values(currentFilters).some(
    (value) => value !== undefined && value !== '' && value !== null
  );

  const handleSaveSearch = async () => {
    if (!saveForm.name.trim()) return;

    const searchData: CreateSavedSearchData = {
      name: saveForm.name.trim(),
      description: saveForm.description.trim() || undefined,
      filters: currentFilters,
      is_default: saveForm.is_default,
    };

    if (editingSearch) {
      await updateSavedSearch(editingSearch.id, searchData);
    } else {
      await createSavedSearch(searchData);
    }

    // Reset form
    setSaveForm({ name: '', description: '', is_default: false });
    setShowSaveDialog(false);
    setEditingSearch(null);
  };

  const handleEditSearch = (search: SavedSearch) => {
    setEditingSearch(search);
    setSaveForm({
      name: search.name,
      description: search.description || '',
      is_default: search.is_default,
    });
    setShowSaveDialog(true);
  };

  const handleDeleteSearch = async (searchId: string) => {
    if (confirm('Are you sure you want to delete this saved search?')) {
      await deleteSavedSearch(searchId);
    }
  };

  const handleApplySearch = (search: SavedSearch) => {
    onApplySearch(search.filters);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Saved searches dropdown and actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Saved searches dropdown */}
        {savedSearches.length > 0 && (
          <div className="min-w-[200px]">
            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Saved Searches
            </label>
            <SharedSelect
              simple
              simpleValue=""
              onSimpleChange={(value) => {
                const search = savedSearches.find((s) => s.id === value);
                if (search) {
                  handleApplySearch(search);
                }
              }}
              simpleOptions={[
                { value: '', label: 'Select a saved search...' },
                ...savedSearches.map((search) => ({
                  value: search.id,
                  label: search.is_default
                    ? `${search.name} (default)`
                    : search.name,
                })),
              ]}
            />
          </div>
        )}

        {/* Save current filters */}
        {hasActiveFilters && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg"
          >
            Save Search
          </button>
        )}

        {/* Manage searches */}
        {savedSearches.length > 0 && (
          <div className="relative">
            <details className="group">
              <summary className="px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-lg cursor-pointer">
                Manage
              </summary>
              <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-10">
                <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                  {savedSearches.map((search) => (
                    <div
                      key={search.id}
                      className="flex items-center justify-between p-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {search.name}
                          </span>
                          {search.is_default && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        {search.description && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                            {search.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleApplySearch(search)}
                          className="p-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded"
                          title="Apply search"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => handleEditSearch(search)}
                          className="p-1 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-600 rounded"
                          title="Edit search"
                        >
                          Edit
                        </button>
                        {!search.is_default && (
                          <button
                            onClick={() => setAsDefault(search.id)}
                            className="p-1 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-600 rounded"
                            title="Set as default"
                          >
                            Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSearch(search.id)}
                          className="p-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                          title="Delete search"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          </div>
        )}

        {loading && (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Loading saved searches...
          </div>
        )}
      </div>

      {/* Save/Edit dialog */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSaveDialog(false);
              setEditingSearch(null);
            }
          }}
        >
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              {editingSearch ? 'Edit Saved Search' : 'Save Current Search'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={saveForm.name}
                  onChange={(e) =>
                    setSaveForm({ ...saveForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                  placeholder="Enter search name"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  value={saveForm.description}
                  onChange={(e) =>
                    setSaveForm({ ...saveForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
                  placeholder="Optional description"
                  rows={2}
                  maxLength={500}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={saveForm.is_default}
                  onChange={(e) =>
                    setSaveForm({ ...saveForm, is_default: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 bg-white border-neutral-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="is_default"
                  className="ml-2 text-sm text-neutral-700 dark:text-neutral-300"
                >
                  Set as default search
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setEditingSearch(null);
                  setSaveForm({ name: '', description: '', is_default: false });
                }}
                className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSearch}
                disabled={!saveForm.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
              >
                {editingSearch ? 'Update' : 'Save'} Search
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
