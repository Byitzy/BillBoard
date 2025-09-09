import type { SupabaseClient } from '@supabase/supabase-js';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'hold'
  | 'pay'
  | 'cancel'
  | 'invite'
  | 'join'
  | 'leave'
  | 'upload'
  | 'download';

export type AuditTarget =
  | 'bill'
  | 'bill_occurrence'
  | 'vendor'
  | 'project'
  | 'organization'
  | 'org_member'
  | 'org_invite'
  | 'attachment'
  | 'approval';

export interface CreateAuditLogParams {
  orgId: string;
  actorId: string;
  action: AuditAction;
  targetType: AuditTarget;
  targetId: string;
  diff?: any;
  ip?: string;
  userAgent?: string;
}

export async function createAuditLog(
  supabase: SupabaseClient,
  params: CreateAuditLogParams
) {
  try {
    const { error } = await (supabase as any).from('audit_log').insert({
      org_id: params.orgId,
      actor_id: params.actorId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      diff: params.diff || null,
      ip: params.ip,
      user_agent: params.userAgent,
    });

    if (error) throw error;
  } catch (error) {
    // Audit log creation failed - continue silently
  }
}

// Utility function to extract IP and User Agent from request headers
export function getRequestInfo(request: Request): {
  ip?: string;
  userAgent?: string;
} {
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    undefined;
  const userAgent = request.headers.get('user-agent') || undefined;

  return { ip, userAgent };
}

// Common audit log templates
export const AuditTemplates = {
  billCreated: (billId: string, billData: any) => ({
    action: 'create' as AuditAction,
    targetType: 'bill' as AuditTarget,
    targetId: billId,
    diff: { created: billData },
  }),

  billUpdated: (billId: string, changes: any) => ({
    action: 'update' as AuditAction,
    targetType: 'bill' as AuditTarget,
    targetId: billId,
    diff: changes,
  }),

  billApproved: (occurrenceId: string, approverId: string) => ({
    action: 'approve' as AuditAction,
    targetType: 'bill_occurrence' as AuditTarget,
    targetId: occurrenceId,
    diff: { approved_by: approverId, status: 'approved' },
  }),

  billOnHold: (occurrenceId: string, reason?: string) => ({
    action: 'hold' as AuditAction,
    targetType: 'bill_occurrence' as AuditTarget,
    targetId: occurrenceId,
    diff: { status: 'on_hold', reason },
  }),

  billPaid: (occurrenceId: string, amount: number, method?: string) => ({
    action: 'pay' as AuditAction,
    targetType: 'bill_occurrence' as AuditTarget,
    targetId: occurrenceId,
    diff: { status: 'paid', amount, payment_method: method },
  }),

  memberInvited: (inviteId: string, email: string, role: string) => ({
    action: 'invite' as AuditAction,
    targetType: 'org_invite' as AuditTarget,
    targetId: inviteId,
    diff: { email, role },
  }),

  memberJoined: (memberId: string, email: string, role: string) => ({
    action: 'join' as AuditAction,
    targetType: 'org_member' as AuditTarget,
    targetId: memberId,
    diff: { email, role },
  }),

  fileUploaded: (attachmentId: string, fileName: string, size: number) => ({
    action: 'upload' as AuditAction,
    targetType: 'attachment' as AuditTarget,
    targetId: attachmentId,
    diff: { file_name: fileName, file_size: size },
  }),
};
