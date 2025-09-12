/**
 * Batch operations hook for optimizing N+1 queries in bills system
 * Provides bulk loading of bill occurrence states and approver info
 */

import { useCallback, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export interface BillBatchData {
  occurrenceStates: Map<string, string>; // billId -> occurrence state
  approverInfo: Map<string, string>; // billId -> approver name
  nextDueDates: Record<string, string>; // billId -> next due date
}

export function useBillsBatch() {
  const supabase = getSupabaseClient();

  /**
   * Load occurrence states for multiple bills in a single query
   */
  const loadBillOccurrenceStates = useCallback(
    async (billIds: string[]): Promise<Map<string, string>> => {
      if (billIds.length === 0) return new Map();

      const { data } = await supabase
        .from('bill_occurrences')
        .select('bill_id, state')
        .in('bill_id', billIds)
        .order('created_at', { ascending: false });

      const stateMap = new Map<string, string>();
      data?.forEach((occ) => {
        if (!stateMap.has(occ.bill_id)) {
          stateMap.set(occ.bill_id, occ.state);
        }
      });

      return stateMap;
    },
    [supabase]
  );

  /**
   * Load approver info for multiple bills in a single query
   */
  const loadBillApprovers = useCallback(
    async (billIds: string[]): Promise<Map<string, string>> => {
      if (billIds.length === 0) return new Map();

      // Temporarily disable this complex query to prevent 400 errors
      // TODO: Fix the approvals join query once schema is confirmed
      const approverMap = new Map<string, string>();
      return approverMap;

      // const { data } = await supabase
      //   .from('bill_occurrences')
      //   .select(
      //     `
      //   bill_id,
      //   approvals(
      //     approver_id,
      //     profiles!approvals_approver_id_fkey(
      //       full_name,
      //       email
      //     )
      //   )
      // `
      //   )
      //   .in('bill_id', billIds)
      //   .eq('state', 'approved')
      //   .order('created_at', { ascending: false });

      // Commented out until query is fixed
      // const approverMap = new Map<string, string>();
      // data?.forEach((occ: any) => {
      //   if (!approverMap.has(occ.bill_id) && occ.approvals?.[0]?.profiles) {
      //     const approver = occ.approvals[0].profiles;
      //     approverMap.set(occ.bill_id, approver.full_name || approver.email);
      //   }
      // });

      // return approverMap;
    },
    []
  );

  /**
   * Load next due dates for recurring bills in a single query
   */
  const loadNextDueDates = useCallback(
    async (billIds: string[]): Promise<Record<string, string>> => {
      if (billIds.length === 0) return {};

      const today = new Date();
      const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const { data } = await supabase
        .from('bill_occurrences')
        .select('bill_id, due_date')
        .in('bill_id', billIds)
        .gte('due_date', iso)
        .order('due_date', { ascending: true });

      const nextDueMap: Record<string, string> = {};
      data?.forEach((occ: any) => {
        if (!nextDueMap[occ.bill_id]) {
          nextDueMap[occ.bill_id] = occ.due_date;
        }
      });

      return nextDueMap;
    },
    [supabase]
  );

  /**
   * Load all batch data for a list of bills in optimized queries
   */
  const loadBillsBatchData = useCallback(
    async (billIds: string[]): Promise<BillBatchData> => {
      if (billIds.length === 0) {
        return {
          occurrenceStates: new Map(),
          approverInfo: new Map(),
          nextDueDates: {},
        };
      }

      // Execute all queries in parallel
      const [occurrenceStates, approverInfo, nextDueDates] = await Promise.all([
        loadBillOccurrenceStates(billIds),
        loadBillApprovers(billIds),
        loadNextDueDates(billIds),
      ]);

      return {
        occurrenceStates,
        approverInfo,
        nextDueDates,
      };
    },
    [loadBillOccurrenceStates, loadBillApprovers, loadNextDueDates]
  );

  /**
   * Load occurrences for multiple recurring bills in a single query
   */
  const loadBillOccurrencesBatch = useCallback(
    async (billIds: string[], limit: number = 10) => {
      if (billIds.length === 0) return new Map();

      const { data } = await supabase
        .from('bill_occurrences')
        .select(
          `
        id,
        bill_id,
        sequence,
        amount_due,
        due_date,
        state,
        approvals(
          approver_id,
          decided_at
        )
      `
        )
        .in('bill_id', billIds)
        .order('sequence', { ascending: true })
        .limit(limit * billIds.length); // Rough limit per bill

      // Group by bill_id
      const occurrencesMap = new Map();
      data?.forEach((occ) => {
        if (!occurrencesMap.has(occ.bill_id)) {
          occurrencesMap.set(occ.bill_id, []);
        }
        occurrencesMap.get(occ.bill_id).push(occ);
      });

      // Limit occurrences per bill
      occurrencesMap.forEach((occurrences, billId) => {
        if (occurrences.length > limit) {
          occurrencesMap.set(billId, occurrences.slice(0, limit));
        }
      });

      return occurrencesMap;
    },
    [supabase]
  );

  return {
    loadBillOccurrenceStates,
    loadBillApprovers,
    loadNextDueDates,
    loadBillsBatchData,
    loadBillOccurrencesBatch,
  };
}
