'use client';

import { Check, Clock, X, MessageSquare, User } from 'lucide-react';
import { useState } from 'react';
import { ErrorDisplay } from '@/components/ui/ErrorDisplay';
import { useApprovals } from '@/hooks/useApprovals';

interface ApprovalPanelProps {
  billOccurrenceId: string;
  currentUserId?: string;
  showHistory?: boolean;
  compact?: boolean;
}

export default function ApprovalPanel({
  billOccurrenceId,
  currentUserId,
  showHistory = false,
  compact = false,
}: ApprovalPanelProps) {
  const [notes, setNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<
    'approved' | 'hold' | 'rejected' | null
  >(null);

  const {
    approvals,
    createApproval,
    getUserApproval,
    getApprovalSummary,
    getOverallStatus,
    loading,
    createLoading,
  } = useApprovals(billOccurrenceId);

  const currentUserApproval = currentUserId
    ? getUserApproval(currentUserId)
    : null;
  const approvalSummary = getApprovalSummary();
  const overallStatus = getOverallStatus();

  const handleApprovalDecision = async (
    decision: 'approved' | 'hold' | 'rejected'
  ) => {
    setPendingDecision(decision);

    const result = await createApproval({
      billOccurrenceId,
      decision,
      notes: notes.trim() || undefined,
    });

    if (result.success) {
      setNotes('');
      setShowNotesInput(false);
    }

    setPendingDecision(null);
  };

  const getStatusIcon = (decision: string) => {
    switch (decision) {
      case 'approved':
        return <Check className="h-4 w-4" />;
      case 'hold':
        return <Clock className="h-4 w-4" />;
      case 'rejected':
        return <X className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getStatusColor = (decision: string) => {
    switch (decision) {
      case 'approved':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'hold':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'rejected':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-neutral-600 bg-neutral-50 border-neutral-200';
    }
  };

  const getOverallStatusDisplay = () => {
    if (!overallStatus) return null;

    const statusConfig = {
      approved: { label: 'Approved', color: 'text-emerald-600', icon: Check },
      pending: {
        label: 'Pending Review',
        color: 'text-amber-600',
        icon: Clock,
      },
      on_hold: { label: 'On Hold', color: 'text-amber-600', icon: Clock },
      rejected: { label: 'Rejected', color: 'text-red-600', icon: X },
    };

    const config = statusConfig[overallStatus];
    const Icon = config.icon;

    return (
      <div
        className={`flex items-center gap-1 text-sm font-medium ${config.color}`}
      >
        <Icon className="h-4 w-4" />
        {config.label}
      </div>
    );
  };

  if (loading && approvals.length === 0) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-neutral-200 rounded mb-2"></div>
        <div className="h-4 bg-neutral-200 rounded w-32"></div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {getOverallStatusDisplay()}
        <div className="text-xs text-neutral-500">
          {approvalSummary.approved}/{approvalSummary.total} approved
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <div className="flex items-center justify-between">
        <div>{getOverallStatusDisplay()}</div>
        <div className="text-sm text-neutral-600">
          {approvalSummary.approved} approved, {approvalSummary.onHold} on hold,{' '}
          {approvalSummary.rejected} rejected
        </div>
      </div>

      {/* Action Buttons - only show if user hasn't decided yet or wants to change */}
      {currentUserId && (
        <div className="space-y-3">
          {currentUserApproval && (
            <div className="text-sm text-neutral-600">
              Your decision:
              <span
                className={`ml-1 inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                  currentUserApproval.decision
                )}`}
              >
                {getStatusIcon(currentUserApproval.decision)}
                {currentUserApproval.decision}
              </span>
              {currentUserApproval.notes && (
                <div className="mt-1 text-xs text-neutral-500">
                  Note: {currentUserApproval.notes}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleApprovalDecision('approved')}
              disabled={createLoading && pendingDecision === 'approved'}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              {createLoading && pendingDecision === 'approved'
                ? 'Approving...'
                : 'Approve'}
            </button>

            <button
              onClick={() => handleApprovalDecision('hold')}
              disabled={createLoading && pendingDecision === 'hold'}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 text-white px-3 py-2 text-sm font-medium hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Clock className="h-4 w-4" />
              {createLoading && pendingDecision === 'hold'
                ? 'Putting on Hold...'
                : 'Hold'}
            </button>

            <button
              onClick={() => handleApprovalDecision('rejected')}
              disabled={createLoading && pendingDecision === 'rejected'}
              className="inline-flex items-center gap-1 rounded-lg bg-red-600 text-white px-3 py-2 text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4" />
              {createLoading && pendingDecision === 'rejected'
                ? 'Rejecting...'
                : 'Reject'}
            </button>

            <button
              onClick={() => setShowNotesInput(!showNotesInput)}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <MessageSquare className="h-4 w-4" />
              Add Note
            </button>
          </div>

          {showNotesInput && (
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note explaining your decision (optional)"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
              />
              <div className="text-xs text-neutral-500">
                This note will be visible to other team members
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approval History */}
      {showHistory && approvals.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-neutral-900">
            Approval History
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className="flex items-start justify-between rounded-lg border border-neutral-200 p-3 text-sm"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium border ${getStatusColor(
                      approval.decision
                    )}`}
                  >
                    {getStatusIcon(approval.decision)}
                    {approval.decision}
                  </div>
                  <div>
                    <div className="font-medium text-neutral-900">
                      {approval.org_members?.users?.name ||
                        approval.org_members?.users?.email ||
                        'Unknown User'}
                    </div>
                    {approval.notes && (
                      <div className="mt-1 text-neutral-600">
                        {approval.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-neutral-500">
                  {new Date(approval.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
