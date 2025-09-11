/**
 * Shared hook for common bill operations
 * Consolidates duplicated status update and occurrence loading logic
 */

import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getEffectiveStatus, type BillStatus } from '@/lib/bills/status';

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
        console.log(`Bill ${billId} has occurrence with state:`, data[0].state);
        setBillOccurrenceState(data[0].state);
      } else {
        console.log(`Bill ${billId} has no occurrences - using bill status`);
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
  }, [billId, hasOccurrences, supabase]);

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

  return {
    loading,
    billOccurrenceState,
    effectiveStatus,
    approver,
    loadBillOccurrenceState,
    loadApproverInfo,
    updateStatus,
    markAsPaid,
  };
}
