import { NextRequest, NextResponse } from 'next/server';
import { getServerClient, getServiceClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { orgId: string } }) {
  const orgId = params.orgId;

  const userClient = getServerClient();
  const {
    data: { user }
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Ensure requester is admin of org
  const { data: me, error: meErr } = await userClient
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 400 });
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const admin = getServiceClient();
  const { data: members, error: mErr } = await admin
    .from('org_members')
    .select('id, user_id, role, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 400 });

  const enriched = await Promise.all(
    (members ?? []).map(async (m) => {
      try {
        const res = await admin.auth.admin.getUserById(m.user_id);
        const email = res.data.user?.email ?? null;
        return { ...m, email };
      } catch {
        return { ...m, email: null };
      }
    })
  );

  return NextResponse.json({ members: enriched });
}

