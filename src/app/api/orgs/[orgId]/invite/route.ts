import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, getUserFromRequest } from '@/lib/supabase/server';

export async function POST(req: NextRequest, { params }: { params: { orgId: string } }) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.toString().trim();
  const role = (body?.role?.toString() || 'viewer') as 'admin' | 'approver' | 'accountant' | 'data_entry' | 'analyst' | 'viewer';
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });
  const orgId = params.orgId;

  // Verify requester is admin of org using cookie-authenticated client
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = getServiceClient();
  const { data: me, error: meErr } = await admin
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 400 });
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Use service role to invite/create user and assign membership
  const inviteRes = await admin.auth.admin.inviteUserByEmail(email).catch((e: any) => ({ error: e }));
  const invitedUser = (inviteRes as any)?.user;

  // If invite API not available or failed (e.g., user exists), look up existing auth user
  let targetUserId: string | null = invitedUser?.id ?? null;
  if (!targetUserId) {
    const { data: users, error: usersErr } = await admin.auth.admin.listUsers();
    if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 400 });
    const found = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    targetUserId = found?.id ?? null;
  }

  if (!targetUserId) {
    return NextResponse.json({ error: 'user not found or invite failed' }, { status: 400 });
  }

  const { error: memErr } = await admin
    .from('org_members')
    .insert({ org_id: orgId, user_id: targetUserId, role });
  if (memErr) return NextResponse.json({ error: memErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
export const dynamic = 'force-dynamic';
