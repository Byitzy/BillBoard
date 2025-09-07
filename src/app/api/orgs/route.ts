import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServiceClient, getUserFromRequest } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = body?.name?.toString().trim();
  const slug = body?.slug?.toString().trim() || null;
  if (!name)
    return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const user = await getUserFromRequest(req);
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = getServiceClient();
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({ name, slug })
    .select('id,name,slug')
    .single();
  if (orgErr)
    return NextResponse.json({ error: orgErr.message }, { status: 400 });

  const { error: memErr } = await admin
    .from('org_members')
    .insert({ org_id: org.id, user_id: user.id, role: 'admin' });
  if (memErr)
    return NextResponse.json({ error: memErr.message }, { status: 400 });

  return NextResponse.json({ organization: org }, { status: 201 });
}
export const dynamic = 'force-dynamic';
