/**
 * Hook for bulk bill operations
 * Provides functionality for batch status updates and other bulk actions
 */

import { type BillStatus } from '@/lib/bills/status';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useCallback, useState } from 'react';

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: string[];
}

export function useBulkBillOperations() {
  const [loading, setLoading] = useState(false);
  const supabase = getSupabaseClient();

  /**
   * Update status for multiple bills (optimized with batching)
   */
  const bulkUpdateStatus = useCallback(
    async (
      billIds: string[],
      newStatus: BillStatus
    ): Promise<BulkOperationResult> => {
      setLoading(true);
      const result: BulkOperationResult = { success: 0, failed: 0, errors: [] };

      try {
        const orgId = await getDefaultOrgId(supabase);
        if (!orgId) throw new Error('No organization found');

        if (billIds.length === 0) {
          return result;
        }

        // Batch query: Get all bill info in one query
        const { data: bills, error: billsError } = await supabase
          .from('bills')
          .select('id, recurring_rule, status')
          .in('id', billIds)
          .eq('org_id', orgId);

        if (billsError) {
          throw billsError;
        }

        if (!bills || bills.length === 0) {
          result.failed = billIds.length;
          result.errors.push('No bills found');
          return result;
        }

        // Separate recurring and non-recurring bills
        const recurringBills = bills.filter((b) => !!b.recurring_rule);
        const nonRecurringBills = bills.filter((b) => !b.recurring_rule);

        // Execute updates in parallel
        const updatePromises = [];

        // Update recurring bills (occurrences)
        if (recurringBills.length > 0) {
          const occurrenceState =
            newStatus === 'active' ? 'scheduled' : newStatus;
          updatePromises.push(
            supabase
              .from('bill_occurrences')
              .update({ state: occurrenceState as any })
              .in(
                'bill_id',
                recurringBills.map((b) => b.id)
              )
              .order('created_at', { ascending: false })
          );
        }

        // Update non-recurring bills
        if (nonRecurringBills.length > 0) {
          const billStatus =
            newStatus === 'scheduled' || newStatus === 'failed'
              ? 'active'
              : newStatus;
          updatePromises.push(
            supabase
              .from('bills')
              .update({ status: billStatus as any })
              .in(
                'id',
                nonRecurringBills.map((b) => b.id)
              )
              .eq('org_id', orgId)
          );
        }

        // Wait for all updates to complete
        const updateResults = await Promise.allSettled(updatePromises);

        // Count successes and failures
        updateResults.forEach((updateResult, index) => {
          if (updateResult.status === 'fulfilled') {
            const affectedCount =
              index === 0 ? recurringBills.length : nonRecurringBills.length;
            result.success += affectedCount;
          } else {
            const affectedCount =
              index === 0 ? recurringBills.length : nonRecurringBills.length;
            result.failed += affectedCount;
            result.errors.push(
              `Update failed: ${updateResult.reason?.message || 'Unknown error'}`
            );
          }
        });
      } catch (error) {
        result.failed = billIds.length;
        result.errors.push(
          error instanceof Error
            ? error.message
            : 'Failed to process bulk update'
        );
      } finally {
        setLoading(false);
      }

      return result;
    },
    [supabase]
  );

  /**
   * Mark multiple bills as paid (optimized with batching)
   */
  const bulkMarkAsPaid = useCallback(
    async (billIds: string[]): Promise<BulkOperationResult> => {
      setLoading(true);
      const result: BulkOperationResult = { success: 0, failed: 0, errors: [] };

      try {
        const orgId = await getDefaultOrgId(supabase);
        if (!orgId) throw new Error('No organization found');

        if (billIds.length === 0) {
          return result;
        }

        // Batch query: Get all bill info in one query
        const { data: bills, error: billsError } = await supabase
          .from('bills')
          .select('id, recurring_rule, status')
          .in('id', billIds)
          .eq('org_id', orgId);

        if (billsError) {
          throw billsError;
        }

        if (!bills || bills.length === 0) {
          result.failed = billIds.length;
          result.errors.push('No bills found');
          return result;
        }

        // Separate recurring and non-recurring bills
        const recurringBills = bills.filter((b) => !!b.recurring_rule);
        const nonRecurringBills = bills.filter((b) => !b.recurring_rule);

        // Execute updates in parallel
        const updatePromises = [];

        // Update recurring bills (occurrences)
        if (recurringBills.length > 0) {
          updatePromises.push(
            supabase
              .from('bill_occurrences')
              .update({ state: 'paid' as any })
              .in(
                'bill_id',
                recurringBills.map((b) => b.id)
              )
              .order('created_at', { ascending: false })
          );
        }

        // Update non-recurring bills
        if (nonRecurringBills.length > 0) {
          updatePromises.push(
            supabase
              .from('bills')
              .update({ status: 'paid' as any })
              .in(
                'id',
                nonRecurringBills.map((b) => b.id)
              )
              .eq('org_id', orgId)
          );
        }

        // Wait for all updates to complete
        const updateResults = await Promise.allSettled(updatePromises);

        // Count successes and failures
        updateResults.forEach((updateResult, index) => {
          if (updateResult.status === 'fulfilled') {
            const affectedCount =
              index === 0 ? recurringBills.length : nonRecurringBills.length;
            result.success += affectedCount;
          } else {
            const affectedCount =
              index === 0 ? recurringBills.length : nonRecurringBills.length;
            result.failed += affectedCount;
            result.errors.push(
              `Update failed: ${updateResult.reason?.message || 'Unknown error'}`
            );
          }
        });
      } catch (error) {
        result.failed = billIds.length;
        result.errors.push(
          error instanceof Error
            ? error.message
            : 'Failed to process bulk payment'
        );
      } finally {
        setLoading(false);
      }

      return result;
    },
    [supabase]
  );

  /**
   * Bulk archive bills (soft delete by setting canceled status)
   */
  const bulkArchiveBills = useCallback(
    async (billIds: string[]): Promise<BulkOperationResult> => {
      setLoading(true);
      const result: BulkOperationResult = { success: 0, failed: 0, errors: [] };

      try {
        const orgId = await getDefaultOrgId(supabase);
        if (!orgId) throw new Error('No organization found');

        if (billIds.length === 0) {
          return result;
        }

        // Single batch update for all bills
        const { data, error } = await supabase
          .from('bills')
          .update({ status: 'canceled' as any })
          .in('id', billIds)
          .eq('org_id', orgId)
          .select('id'); // Get affected rows count

        if (error) {
          result.failed = billIds.length;
          result.errors.push(`Failed to archive bills: ${error.message}`);
        } else {
          const affectedCount = data?.length || 0;
          result.success = affectedCount;
          result.failed = billIds.length - affectedCount;
          if (result.failed > 0) {
            result.errors.push(`${result.failed} bills could not be archived`);
          }
        }
      } catch (error) {
        result.failed = billIds.length;
        result.errors.push(
          error instanceof Error ? error.message : 'Failed to archive bills'
        );
      } finally {
        setLoading(false);
      }

      return result;
    },
    [supabase]
  );

  return {
    loading,
    bulkUpdateStatus,
    bulkMarkAsPaid,
    bulkArchiveBills,
  };
}
