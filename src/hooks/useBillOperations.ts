/**
 * Shared hook for common bill operations
 * Consolidates duplicated status update and occurrence loading logic
 */

import { getEffectiveStatus, type BillStatus } from '@/lib/bills/status';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useCallback, useState } from 'react';

export interface BillOperationsResult {
  loading: boolean;
  billOccurrenceState: string | null;
  effectiveStatus: BillStatus;
  approver: string | null;

  // Operations
  loadBillOccurrenceState: () => Promise<void>;
  loadApproverInfo: () => Promise<void>;
  updateStatus: (newStatus: BillStatus) => Promise<void>;
  markAsPaid: () => Promise<void>;
  deleteBill: () => Promise<boolean>;
}

export function useBillOperations(
  billId: string,
  billStatus: string,
  isRecurring: boolean = false,
  onUpdate?: () => void
): BillOperationsResult {
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [billOccurrenceState, setBillOccurrenceState] = useState<string | null>(
    null
  );
  const [approver, setApprover] = useState<string | null>(null);

  const effectiveStatus = getEffectiveStatus(billStatus, billOccurrenceState);
  const hasOccurrences = !!billOccurrenceState;

  /**
   * Load bill occurrence state (shared logic across components)
   */
  const loadBillOccurrenceState = useCallback(async () => {
    if (!billId) return;

    try {
      const { data, error } = await supabase
        .from('bill_occurrences')
        .select('state')
        .eq('bill_id', billId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading bill occurrence state:', error);
        return;
      }

      if (data?.[0]) {
        setBillOccurrenceState(data[0].state);
      } else {
        setBillOccurrenceState(null);
      }
    } catch (error) {
      console.error('Failed to load bill occurrence state:', error);
    }
  }, [billId, supabase]);

  /**
   * Load approver information for approved bills (shared logic)
   */
  const loadApproverInfo = useCallback(async () => {
    if (!billId || !hasOccurrences) return;

    try {
      // Temporarily disabled to prevent 400 errors
      // TODO: Fix approvals query once schema is confirmed
      setApprover(null);
      return;

      // const { data } = await supabase
      //   .from('bill_occurrences')
      //   .select(
      //     `
      //     id,
      //     approvals(
      //       approver_id,
      //       decided_at
      //     )
      //   `
      //   )
      //   .eq('bill_id', billId)
      //   .eq('state', 'approved')
      //   .limit(1);

      // if (data?.[0]?.approvals?.[0]) {
      //   setApprover('Admin'); // Simplified for now
      // }
    } catch (error) {
      console.error('Failed to load approver info:', error);
    }
  }, [billId, hasOccurrences]);

  /**
   * Update bill status (handles both occurrence and non-occurrence bills)
   */
  const updateStatus = useCallback(
    async (newStatus: BillStatus) => {
      if (isRecurring) return;

      setLoading(true);
      try {
        if (hasOccurrences) {
          // Bill has occurrences - update occurrence state
          await supabase
            .from('bill_occurrences')
            .update({ state: newStatus as any })
            .eq('bill_id', billId);
        } else {
          // Bill has no occurrences - update bill status directly
          await supabase
            .from('bills')
            .update({ status: newStatus as any })
            .eq('id', billId);
        }

        // Reload state after update
        await loadBillOccurrenceState();
        onUpdate?.();
      } catch (error) {
        console.error('Failed to update status:', error);
      } finally {
        setLoading(false);
      }
    },
    [
      billId,
      hasOccurrences,
      isRecurring,
      loadBillOccurrenceState,
      onUpdate,
      supabase,
    ]
  );

  /**
   * Mark bill as paid (handles both occurrence and non-occurrence bills)
   */
  const markAsPaid = useCallback(async () => {
    if (isRecurring) return;

    setLoading(true);
    try {
      if (hasOccurrences) {
        // Bill has occurrences - update occurrence state
        await supabase
          .from('bill_occurrences')
          .update({ state: 'paid' })
          .eq('bill_id', billId);
      } else {
        // Bill has no occurrences - update bill status directly
        await supabase
          .from('bills')
          .update({ status: 'paid' as any })
          .eq('id', billId);
      }

      // Reload state after update
      await loadBillOccurrenceState();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to mark as paid:', error);
    } finally {
      setLoading(false);
    }
  }, [
    billId,
    hasOccurrences,
    isRecurring,
    loadBillOccurrenceState,
    onUpdate,
    supabase,
  ]);

  /**
   * Permanently delete a bill and all related data
   */
  const deleteBill = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      // Get user for security (should be cached by Supabase)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Batch delete operations to reduce round trips
      const deleteOperations = [
        // Delete bill occurrences first
        supabase.from('bill_occurrences').delete().eq('bill_id', billId),
        // Delete the bill itself (this will cascade delete comments and attachments)
        supabase.from('bills').delete().eq('id', billId),
      ];

      // Execute all delete operations in parallel
      const results = await Promise.allSettled(deleteOperations);

      // Check for any errors
      const failures = results.filter((result) => result.status === 'rejected');
      if (failures.length > 0) {
        console.error('Delete operation failures:', failures);
        throw new Error('Some delete operations failed');
      }

      // Trigger refresh with a small delay to allow UI to settle
      setTimeout(() => {
        onUpdate?.();
      }, 100);

      return true;
    } catch (error) {
      console.error('Failed to delete bill:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [billId, supabase, onUpdate]);

  return {
    loading,
    billOccurrenceState,
    effectiveStatus,
    approver,
    loadBillOccurrenceState,
    loadApproverInfo,
    updateStatus,
    markAsPaid,
    deleteBill,
  };
}
