/**
 * Hook for bulk bill operations
 * Provides functionality for batch status updates and other bulk actions
 */

import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';
import { type BillStatus } from '@/lib/bills/status';

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: string[];
}

export function useBulkBillOperations() {
  const [loading, setLoading] = useState(false);
  const supabase = getSupabaseClient();

  /**
   * Update status for multiple bills
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

        // For each bill, we need to check if it's recurring and update accordingly
        for (const billId of billIds) {
          try {
            // Get bill info to determine if it's recurring
            const { data: bill } = await supabase
              .from('bills')
              .select('recurring_rule, status')
              .eq('id', billId)
              .eq('org_id', orgId)
              .single();

            if (!bill) {
              result.failed++;
              result.errors.push(`Bill ${billId} not found`);
              continue;
            }

            const isRecurring = !!bill.recurring_rule;

            if (isRecurring) {
              // For recurring bills, update the latest bill occurrence
              // Map bill status to occurrence state
              const occurrenceState =
                newStatus === 'active' ? 'scheduled' : newStatus;
              const { error } = await supabase
                .from('bill_occurrences')
                .update({ state: occurrenceState as any })
                .eq('bill_id', billId)
                .order('created_at', { ascending: false })
                .limit(1);

              if (error) {
                result.failed++;
                result.errors.push(
                  `Failed to update occurrences for bill ${billId}: ${error.message}`
                );
              } else {
                result.success++;
              }
            } else {
              // For non-recurring bills, update the bill status directly
              // Ensure we only use valid bill statuses
              const billStatus =
                newStatus === 'scheduled' || newStatus === 'failed'
                  ? 'active'
                  : newStatus;
              const { error } = await supabase
                .from('bills')
                .update({ status: billStatus as any })
                .eq('id', billId)
                .eq('org_id', orgId);

              if (error) {
                result.failed++;
                result.errors.push(
                  `Failed to update bill ${billId}: ${error.message}`
                );
              } else {
                result.success++;
              }
            }
          } catch (err) {
            result.failed++;
            result.errors.push(
              `Error processing bill ${billId}: ${err instanceof Error ? err.message : 'Unknown error'}`
            );
          }
        }
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
   * Mark multiple bills as paid
   */
  const bulkMarkAsPaid = useCallback(
    async (billIds: string[]): Promise<BulkOperationResult> => {
      setLoading(true);
      const result: BulkOperationResult = { success: 0, failed: 0, errors: [] };

      try {
        const orgId = await getDefaultOrgId(supabase);
        if (!orgId) throw new Error('No organization found');

        for (const billId of billIds) {
          try {
            // Get bill info
            const { data: bill } = await supabase
              .from('bills')
              .select('recurring_rule, status')
              .eq('id', billId)
              .eq('org_id', orgId)
              .single();

            if (!bill) {
              result.failed++;
              result.errors.push(`Bill ${billId} not found`);
              continue;
            }

            const isRecurring = !!bill.recurring_rule;

            if (isRecurring) {
              // For recurring bills, mark the latest occurrence as paid
              const { error } = await supabase
                .from('bill_occurrences')
                .update({ state: 'paid' as any })
                .eq('bill_id', billId)
                .order('created_at', { ascending: false })
                .limit(1);

              if (error) {
                result.failed++;
                result.errors.push(
                  `Failed to mark occurrence as paid for bill ${billId}: ${error.message}`
                );
              } else {
                result.success++;
              }
            } else {
              // For non-recurring bills, mark the bill as paid
              const { error } = await supabase
                .from('bills')
                .update({ status: 'paid' as any })
                .eq('id', billId)
                .eq('org_id', orgId);

              if (error) {
                result.failed++;
                result.errors.push(
                  `Failed to mark bill ${billId} as paid: ${error.message}`
                );
              } else {
                result.success++;
              }
            }
          } catch (err) {
            result.failed++;
            result.errors.push(
              `Error processing bill ${billId}: ${err instanceof Error ? err.message : 'Unknown error'}`
            );
          }
        }
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
   * Bulk delete bills (soft delete by setting archived status)
   */
  const bulkArchiveBills = useCallback(
    async (billIds: string[]): Promise<BulkOperationResult> => {
      setLoading(true);
      const result: BulkOperationResult = { success: 0, failed: 0, errors: [] };

      try {
        const orgId = await getDefaultOrgId(supabase);
        if (!orgId) throw new Error('No organization found');

        const { error } = await supabase
          .from('bills')
          .update({ status: 'canceled' }) // Use canceled as archived status
          .in('id', billIds)
          .eq('org_id', orgId);

        if (error) {
          result.failed = billIds.length;
          result.errors.push(`Failed to archive bills: ${error.message}`);
        } else {
          result.success = billIds.length;
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
