'use client';

import { useState, useEffect } from 'react';
import type { Database } from '@/types/supabase';
import { useAsyncOperation } from './useAsyncOperation';
import { getSupabaseClient } from '@/lib/supabase/client';

type Approval = Database['public']['Tables']['approvals']['Row'] & {
  org_members: {
    user_id: string;
    users: {
      email: string;
      name: string | null;
    } | null;
  } | null;
};

type ApprovalDecision = 'approved' | 'hold' | 'rejected';

interface CreateApprovalData {
  billOccurrenceId: string;
  decision: ApprovalDecision;
  notes?: string;
}

export function useApprovals(billOccurrenceId?: string) {
  const supabase = getSupabaseClient();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const { execute: executeCreate, loading: createLoading } =
    useAsyncOperation<Approval>();
  const { execute: executeFetch, loading: fetchLoading } =
    useAsyncOperation<Approval[]>();

  const fetchApprovals = async (occurrenceId: string) => {
    const result = await executeFetch(async () => {
      // Get session token for authorization
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `/api/approvals?billOccurrenceId=${encodeURIComponent(occurrenceId)}`,
        {
          headers: {
            ...(session && { Authorization: `Bearer ${session.access_token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch approvals: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    });

    if (result.success) {
      setApprovals(result.data);
    }

    return result;
  };

  const createApproval = async (approvalData: CreateApprovalData) => {
    const result = await executeCreate(async () => {
      // Get session token for authorization
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({
          billOccurrenceId: approvalData.billOccurrenceId,
          decision: approvalData.decision,
          notes: approvalData.notes || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to create approval: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data.data;
    });

    if (result.success && billOccurrenceId) {
      // Refresh approvals after successful creation
      await fetchApprovals(billOccurrenceId);
    }

    return result;
  };

  // Auto-fetch approvals when billOccurrenceId changes
  useEffect(() => {
    if (billOccurrenceId) {
      fetchApprovals(billOccurrenceId);
    }
  }, [billOccurrenceId, fetchApprovals]);

  const getUserApproval = (userId: string): Approval | undefined => {
    return approvals.find((approval) => approval.approver_id === userId);
  };

  const getApprovalSummary = () => {
    const approved = approvals.filter((a) => a.decision === 'approved').length;
    const onHold = approvals.filter((a) => a.decision === 'hold').length;
    const rejected = approvals.filter((a) => a.decision === 'rejected').length;
    const total = approvals.length;

    return { approved, onHold, rejected, total };
  };

  const getOverallStatus = ():
    | 'approved'
    | 'pending'
    | 'on_hold'
    | 'rejected'
    | null => {
    if (approvals.length === 0) return null;

    const hasRejected = approvals.some((a) => a.decision === 'rejected');
    if (hasRejected) return 'rejected';

    const hasOnHold = approvals.some((a) => a.decision === 'hold');
    if (hasOnHold) return 'on_hold';

    const allApproved = approvals.every((a) => a.decision === 'approved');
    if (allApproved && approvals.length > 0) return 'approved';

    return 'pending';
  };

  return {
    approvals,
    fetchApprovals,
    createApproval,
    getUserApproval,
    getApprovalSummary,
    getOverallStatus,
    loading: fetchLoading || createLoading,
    createLoading,
    fetchLoading,
  };
}
