import type { SupabaseClient } from '@supabase/supabase-js';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface CreateNotificationParams {
  orgId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload?: any;
}

export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
) {
  try {
    const { error } = await (supabase as any)
      .from('notifications')
      .insert({
        org_id: params.orgId,
        user_id: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        payload: params.payload || null
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

// Utility functions for common notification scenarios
export const NotificationTemplates = {
  billApproved: (billTitle: string) => ({
    type: 'success' as NotificationType,
    title: 'Bill Approved',
    body: `${billTitle} has been approved and is ready for payment.`
  }),
  
  billOnHold: (billTitle: string, reason?: string) => ({
    type: 'warning' as NotificationType,
    title: 'Bill On Hold',
    body: `${billTitle} has been placed on hold.${reason ? ` Reason: ${reason}` : ''}`
  }),
  
  billPaid: (billTitle: string, amount: number) => ({
    type: 'success' as NotificationType,
    title: 'Bill Paid',
    body: `${billTitle} has been marked as paid ($${amount.toFixed(2)}).`
  }),
  
  dueSoon: (billTitle: string, daysUntil: number) => ({
    type: 'info' as NotificationType,
    title: 'Bill Due Soon',
    body: `${billTitle} is due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}.`
  }),
  
  overdue: (billTitle: string) => ({
    type: 'error' as NotificationType,
    title: 'Bill Overdue',
    body: `${billTitle} is now overdue and requires immediate attention.`
  }),
  
  inviteAccepted: (email: string, orgName: string) => ({
    type: 'success' as NotificationType,
    title: 'Invite Accepted',
    body: `${email} has joined ${orgName}.`
  }),
  
  newMemberAdded: (email: string, role: string) => ({
    type: 'info' as NotificationType,
    title: 'New Member Added',
    body: `${email} has been added as ${role}.`
  })
};