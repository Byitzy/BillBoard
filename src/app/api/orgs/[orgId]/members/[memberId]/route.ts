import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceClient, getUserFromRequest } from '@/lib/supabase/server';

const updateMemberSchema = z
  .object({
    role: z
      .enum([
        'admin',
        'approver',
        'accountant',
        'data_entry',
        'analyst',
        'viewer',
      ])
      .optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
  })
  .refine((data) => data.role || data.status, {
    message: 'Either role or status must be provided',
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  const { orgId, memberId } = await params;

  const user = await getUserFromRequest(request as any);
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Ensure requester is admin of org
  const admin = getServiceClient();
  const { data: me, error: meErr } = await admin
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (meErr)
    return NextResponse.json({ error: meErr.message }, { status: 400 });
  if (!me || me.role !== 'admin')
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const { role, status } = updateMemberSchema.parse(body);

    // Prevent admin from changing their own role or status
    const { data: targetMember } = await admin
      .from('org_members')
      .select('user_id')
      .eq('id', memberId)
      .eq('org_id', orgId)
      .single();

    if (targetMember && targetMember.user_id === user.id) {
      if (role !== undefined) {
        return NextResponse.json(
          { error: 'Cannot change your own role' },
          { status: 400 }
        );
      }
      if (status !== undefined) {
        return NextResponse.json(
          { error: 'Cannot change your own status' },
          { status: 400 }
        );
      }
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    const { data: updatedMember, error } = await admin
      .from('org_members')
      .update(updateData)
      .eq('id', memberId)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; memberId: string }> }
) {
  const { orgId, memberId } = await params;

  const user = await getUserFromRequest(request as any);
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Ensure requester is admin of org
  const admin = getServiceClient();
  const { data: me, error: meErr } = await admin
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (meErr)
    return NextResponse.json({ error: meErr.message }, { status: 400 });
  if (!me || me.role !== 'admin')
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Prevent admin from removing themselves
  const { data: targetMember } = await admin
    .from('org_members')
    .select('user_id')
    .eq('id', memberId)
    .eq('org_id', orgId)
    .single();

  if (targetMember && targetMember.user_id === user.id) {
    return NextResponse.json(
      { error: 'Cannot remove yourself from the organization' },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from('org_members')
    .delete()
    .eq('id', memberId)
    .eq('org_id', orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export const dynamic = 'force-dynamic';
