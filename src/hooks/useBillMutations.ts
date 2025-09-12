/**
 * React Query mutations for bill operations with optimistic updates
 */

import { type BillStatus } from '@/lib/bills/status';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { billsQueryKeys } from './usePaginatedBills';

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: string[];
}

/**
 * Create a new bill
 */
async function createBill(billData: {
  title: string;
  amount_total: number;
  currency: string;
  vendor_id?: string;
  project_id?: string;
  due_date?: string;
  recurring_rule?: any;
  description?: string;
  category?: string;
}) {
  const supabase = getSupabaseClient();
  const orgId = await getDefaultOrgId(supabase);
  if (!orgId) throw new Error('No organization found');

  const { data, error } = await supabase
    .from('bills')
    .insert({ ...billData, org_id: orgId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update bill status (optimized batch version)
 */
async function updateBillStatus({
  billIds,
  newStatus,
}: {
  billIds: string[];
  newStatus: BillStatus;
}): Promise<BulkOperationResult> {
  const supabase = getSupabaseClient();
  const orgId = await getDefaultOrgId(supabase);
  if (!orgId) throw new Error('No organization found');

  if (billIds.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  const result: BulkOperationResult = { success: 0, failed: 0, errors: [] };

  // Batch query: Get all bill info in one query
  const { data: bills, error: billsError } = await supabase
    .from('bills')
    .select('id, recurring_rule, status')
    .in('id', billIds)
    .eq('org_id', orgId);

  if (billsError) throw billsError;

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
    const occurrenceState = newStatus === 'active' ? 'scheduled' : newStatus;
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

  return result;
}

/**
 * Mark bills as paid (optimized batch version)
 */
async function markBillsAsPaid(
  billIds: string[]
): Promise<BulkOperationResult> {
  const supabase = getSupabaseClient();
  const orgId = await getDefaultOrgId(supabase);
  if (!orgId) throw new Error('No organization found');

  if (billIds.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  const result: BulkOperationResult = { success: 0, failed: 0, errors: [] };

  // Batch query: Get all bill info in one query
  const { data: bills, error: billsError } = await supabase
    .from('bills')
    .select('id, recurring_rule, status')
    .in('id', billIds)
    .eq('org_id', orgId);

  if (billsError) throw billsError;

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

  return result;
}

/**
 * Archive bills (soft delete)
 */
async function archiveBills(billIds: string[]): Promise<BulkOperationResult> {
  const supabase = getSupabaseClient();
  const orgId = await getDefaultOrgId(supabase);
  if (!orgId) throw new Error('No organization found');

  if (billIds.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }

  const result: BulkOperationResult = { success: 0, failed: 0, errors: [] };

  // Single batch update for all bills
  const { data, error } = await supabase
    .from('bills')
    .update({ status: 'canceled' as any })
    .in('id', billIds)
    .eq('org_id', orgId)
    .select('id');

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

  return result;
}

/**
 * Delete a single bill permanently
 */
async function deleteSingleBill(billId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

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

  return true;
}

/**
 * React Query mutations for bill operations
 */
export function useBillMutations() {
  const queryClient = useQueryClient();

  // Create bill mutation
  const createBillMutation = useMutation({
    mutationFn: createBill,
    onSuccess: () => {
      // Invalidate and refetch bills
      queryClient.invalidateQueries({ queryKey: billsQueryKeys.lists() });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: updateBillStatus,
    onSuccess: (result) => {
      // Invalidate and refetch bills
      queryClient.invalidateQueries({ queryKey: billsQueryKeys.lists() });
      return result;
    },
  });

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: markBillsAsPaid,
    onSuccess: (result) => {
      // Invalidate and refetch bills
      queryClient.invalidateQueries({ queryKey: billsQueryKeys.lists() });
      return result;
    },
  });

  // Archive bills mutation
  const archiveBillsMutation = useMutation({
    mutationFn: archiveBills,
    onSuccess: (result) => {
      // Invalidate and refetch bills
      queryClient.invalidateQueries({ queryKey: billsQueryKeys.lists() });
      return result;
    },
  });

  // Delete bill mutation
  const deleteBillMutation = useMutation({
    mutationFn: deleteSingleBill,
    onSuccess: (result) => {
      // Invalidate and refetch bills
      queryClient.invalidateQueries({ queryKey: billsQueryKeys.lists() });
      return result;
    },
  });

  return {
    createBill: createBillMutation.mutate,
    createBillAsync: createBillMutation.mutateAsync,
    isCreating: createBillMutation.isPending,

    updateStatus: updateStatusMutation.mutate,
    updateStatusAsync: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,

    markAsPaid: markAsPaidMutation.mutate,
    markAsPaidAsync: markAsPaidMutation.mutateAsync,
    isMarkingAsPaid: markAsPaidMutation.isPending,

    archiveBills: archiveBillsMutation.mutate,
    archiveBillsAsync: archiveBillsMutation.mutateAsync,
    isArchiving: archiveBillsMutation.isPending,

    deleteBill: deleteBillMutation.mutate,
    deleteBillAsync: deleteBillMutation.mutateAsync,
    isDeleting: deleteBillMutation.isPending,
  };
}
