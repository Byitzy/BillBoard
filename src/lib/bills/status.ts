/**
 * Centralized Bill Status Management System
 *
 * This module provides unified status handling for both:
 * - Bills WITHOUT occurrences (use bill.status directly)
 * - Bills WITH occurrences (use occurrence.state)
 */

import {
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  CreditCard,
  Pause,
  X,
  AlertTriangle,
} from 'lucide-react';

// All possible status values across bills and occurrences
export type BillStatus =
  | 'active' // Bill created but not submitted
  | 'pending_approval' // Waiting for approval
  | 'approved' // Approved and ready for payment
  | 'on_hold' // Temporarily paused
  | 'canceled' // Cancelled/rejected
  | 'paid' // Payment completed
  | 'scheduled' // Occurrence scheduled for future
  | 'failed'; // Payment failed

// Status display information
export interface StatusInfo {
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}

// Status workflow definitions
export const STATUS_WORKFLOWS = {
  // For bills WITHOUT occurrences
  SIMPLE_BILL: {
    transitions: {
      active: ['pending_approval', 'canceled'],
      pending_approval: ['approved', 'on_hold', 'canceled'],
      approved: ['paid', 'on_hold'],
      on_hold: ['pending_approval', 'canceled'],
      paid: [],
      canceled: [],
    },
  },

  // For bills WITH occurrences
  OCCURRENCE_BILL: {
    transitions: {
      scheduled: ['pending_approval', 'canceled'],
      pending_approval: ['approved', 'on_hold', 'canceled'],
      approved: ['paid', 'failed', 'on_hold'],
      on_hold: ['pending_approval', 'canceled'],
      paid: [],
      failed: ['pending_approval'],
      canceled: [],
    },
  },
} as const;

/**
 * Get standardized status information for display
 */
export function getStatusInfo(status: BillStatus): StatusInfo {
  const statusMap: Record<BillStatus, StatusInfo> = {
    active: {
      color:
        'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800',
      icon: FileText,
      label: 'Draft',
      description: 'Bill created but not yet submitted for approval',
    },
    scheduled: {
      color:
        'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800',
      icon: Calendar,
      label: 'Scheduled',
      description: 'Occurrence scheduled for future processing',
    },
    pending_approval: {
      color:
        'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
      icon: Clock,
      label: 'Pending Approval',
      description: 'Waiting for approver review',
    },
    approved: {
      color:
        'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
      icon: CheckCircle,
      label: 'Approved',
      description: 'Approved and ready for payment',
    },
    paid: {
      color:
        'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
      icon: CreditCard,
      label: 'Paid',
      description: 'Payment completed successfully',
    },
    on_hold: {
      color:
        'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
      icon: Pause,
      label: 'On Hold',
      description: 'Temporarily paused or requires attention',
    },
    canceled: {
      color:
        'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800',
      icon: X,
      label: 'Canceled',
      description: 'Cancelled or rejected',
    },
    failed: {
      color:
        'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
      icon: AlertTriangle,
      label: 'Failed',
      description: 'Payment attempt failed',
    },
  };

  return statusMap[status] || statusMap['active'];
}

/**
 * Get all possible next statuses for a given current status
 */
export function getPossibleTransitions(
  currentStatus: BillStatus,
  hasOccurrences: boolean
): BillStatus[] {
  const workflow = hasOccurrences
    ? STATUS_WORKFLOWS.OCCURRENCE_BILL
    : STATUS_WORKFLOWS.SIMPLE_BILL;
  const transitions =
    workflow.transitions[currentStatus as keyof typeof workflow.transitions] ||
    [];
  return [...transitions] as BillStatus[];
}

/**
 * Check if a status transition is valid
 */
export function isValidTransition(
  fromStatus: BillStatus,
  toStatus: BillStatus,
  hasOccurrences: boolean
): boolean {
  const possibleTransitions = getPossibleTransitions(
    fromStatus,
    hasOccurrences
  );
  return possibleTransitions.includes(toStatus);
}

/**
 * Get the effective status for a bill (occurrence state OR bill status)
 */
export function getEffectiveStatus(
  billStatus: string,
  occurrenceState: string | null
): BillStatus {
  const status = (occurrenceState || billStatus) as BillStatus;

  // Validate it's a known status
  const validStatuses: BillStatus[] = [
    'active',
    'pending_approval',
    'approved',
    'on_hold',
    'canceled',
    'paid',
    'scheduled',
    'failed',
  ];

  return validStatuses.includes(status) ? status : 'active';
}

/**
 * Get all available statuses for filtering
 */
export function getAllStatuses(): { value: BillStatus; label: string }[] {
  return [
    { value: 'active', label: 'Draft' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'paid', label: 'Paid' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'failed', label: 'Failed' },
    { value: 'canceled', label: 'Canceled' },
  ];
}

/**
 * Get status priority for sorting (lower number = higher priority)
 */
export function getStatusPriority(status: BillStatus): number {
  const priorities: Record<BillStatus, number> = {
    failed: 1, // Highest priority - needs immediate attention
    pending_approval: 2,
    scheduled: 3,
    approved: 4,
    on_hold: 5,
    active: 6,
    paid: 7,
    canceled: 8, // Lowest priority
  };

  return priorities[status] || 999;
}
