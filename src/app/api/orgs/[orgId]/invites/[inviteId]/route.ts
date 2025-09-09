import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; inviteId: string }> }
) {
  try {
    const { orgId, inviteId } = await params;
    const supabase = await getServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await (supabase as any)
      .from('org_invites')
      .delete()
      .eq('id', inviteId)
      .eq('org_id', orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
