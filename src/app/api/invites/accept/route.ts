import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceClient, getUserFromRequest } from '@/lib/supabase/server';

const acceptInviteSchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request as any);
    if (!user)
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = await request.json();
    const { token } = acceptInviteSchema.parse(body);

    const admin = getServiceClient();

    // Call the accept_invite function
    const { data, error } = await (admin as any).rpc('accept_invite', {
      invite_token: token,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // The function returns a JSON object
    const result = data as any;
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      org_id: result.org_id,
      role: result.role,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error accepting invite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
