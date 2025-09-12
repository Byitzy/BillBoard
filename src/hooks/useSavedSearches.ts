/**
 * Hook for managing saved search filters
 * Provides functionality to save, load, and manage filter presets
 */

import { useState, useCallback, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';
import { type BillFilters } from './usePaginatedBills';

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  filters: BillFilters;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSavedSearchData {
  name: string;
  description?: string;
  filters: BillFilters;
  is_default?: boolean;
}

export function useSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  /**
   * Load all saved searches for the current organization
   */
  const loadSavedSearches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const orgId = await getDefaultOrgId(supabase);
      if (!orgId) throw new Error('No organization found');

      // For now, just set empty array to prevent 404 errors
      // TODO: Apply database migration to create bill_saved_searches table
      setSavedSearches([]);
      return;

      // Temporarily disabled until table exists
      // const { data, error } = await supabase
      //   .from('bill_saved_searches' as any)
      //   .select('*')
      //   .eq('org_id', orgId)
      //   .order('is_default', { ascending: false })
      //   .order('name', { ascending: true });

      // if (error) {
      //   // Handle 404 for missing table
      //   if (error.code === 'PGRST116' || error.message.includes('404')) {
      //     setSavedSearches([]);
      //     return;
      //   }
      //   throw error;
      // }

      // setSavedSearches((data as SavedSearch[]) || []);
    } catch (err) {
      // Gracefully handle missing table (404) - just set empty array
      if (
        err instanceof Error &&
        err.message.includes('relation "bill_saved_searches" does not exist')
      ) {
        setSavedSearches([]);
        setError(null); // Don't show error for missing table
      } else {
        setError(
          err instanceof Error ? err.message : 'Failed to load saved searches'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Create a new saved search
   */
  const createSavedSearch = useCallback(
    async (searchData: CreateSavedSearchData): Promise<SavedSearch | null> => {
      setError('Saved searches feature is not available yet');
      return null;

      // Temporarily disabled until table exists
      // try {
      //   const orgId = await getDefaultOrgId(supabase);
      //   if (!orgId) throw new Error('No organization found');

      //   // If setting as default, unset other defaults first
      //   if (searchData.is_default) {
      //     await supabase
      //       .from('bill_saved_searches' as any)
      //       .update({ is_default: false })
      //       .eq('org_id', orgId)
      //       .eq('is_default', true);
      //   }

      //   const { data, error } = await supabase
      //     .from('bill_saved_searches' as any)
      //     .insert({
      //       name: searchData.name,
      //       description: searchData.description,
      //       filters: searchData.filters,
      //       is_default: searchData.is_default || false,
      //       org_id: orgId,
      //     })
      //     .select('*')
      //     .single();

      //   if (error) throw error;

      //   // Refresh the list
      //   await loadSavedSearches();

      //   return data as SavedSearch;
      // } catch (err) {
      //   setError(
      //     err instanceof Error ? err.message : 'Failed to create saved search'
      //   );
      //   return null;
      // }
    },
    []
  );

  /**
   * Update an existing saved search
   */
  const updateSavedSearch = useCallback(
    async (
      id: string,
      updates: Partial<CreateSavedSearchData>
    ): Promise<SavedSearch | null> => {
      setError('Saved searches feature is not available yet');
      return null;
    },
    []
  );

  /**
   * Delete a saved search
   */
  const deleteSavedSearch = useCallback(
    async (id: string): Promise<boolean> => {
      setError('Saved searches feature is not available yet');
      return false;
    },
    []
  );

  /**
   * Set a saved search as default
   */
  const setAsDefault = useCallback(
    async (id: string): Promise<boolean> => {
      return !!(await updateSavedSearch(id, { is_default: true }));
    },
    [updateSavedSearch]
  );

  /**
   * Get the default saved search
   */
  const getDefaultSearch = useCallback((): SavedSearch | null => {
    return savedSearches.find((search) => search.is_default) || null;
  }, [savedSearches]);

  /**
   * Load saved searches on mount
   */
  useEffect(() => {
    loadSavedSearches();
  }, [loadSavedSearches]);

  return {
    savedSearches,
    loading,
    error,
    loadSavedSearches,
    createSavedSearch,
    updateSavedSearch,
    deleteSavedSearch,
    setAsDefault,
    getDefaultSearch,
  };
}
