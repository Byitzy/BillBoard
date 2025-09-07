import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, getUserFromRequest } from '@/lib/supabase/server';
import { z } from 'zod';

const acceptInviteSchema = z.object({
  token: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request as any);
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json();
    const { token } = acceptInviteSchema.parse(body);

    const admin = getServiceClient();
    
    // Call the accept_invite function
    const { data, error } = await admin
      .rpc('accept_invite', { invite_token: token });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, org_id: data.org_id, role: data.role });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';