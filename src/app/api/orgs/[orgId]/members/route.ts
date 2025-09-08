import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServiceClient, getUserFromRequest } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const orgId = params.orgId;

  const user = await getUserFromRequest(_req as any);
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

  const { data: members, error: mErr } = await (admin as any)
    .from('org_members')
    .select('id, user_id, role, status, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 400 });

  const enriched = await Promise.all(
    (members ?? []).map(async (m: any) => {
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
export const dynamic = 'force-dynamic';
