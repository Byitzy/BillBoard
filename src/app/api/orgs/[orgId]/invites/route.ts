import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase/server';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    'admin',
    'approver',
    'accountant',
    'data_entry',
    'analyst',
    'viewer',
  ]),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const supabase = await getServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin of this organization
    const { data: memberRole } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', session.user.id)
      .single();

    if (!memberRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    if (memberRole.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can view invites' },
        { status: 403 }
      );
    }

    const { data: invites, error } = await (supabase as any)
      .from('org_invites')
      .select(
        `
        id,
        email,
        role,
        created_at,
        expires_at,
        accepted_at,
        invited_by:auth.users!invited_by(email)
      `
      )
      .eq('org_id', orgId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invites });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const supabase = await getServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, role, status } = inviteSchema.parse(body);

    // Check if user is an admin of this organization
    const { data: memberRole } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', session.user.id)
      .single();

    if (!memberRole) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    if (memberRole.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can send invites' },
        { status: 403 }
      );
    }

    // Create the invite
    const { data: invite, error } = await (supabase as any)
      .from('org_invites')
      .insert({
        org_id: orgId,
        email,
        role,
        status,
        invited_by: session.user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          { error: 'User already invited or is a member' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // TODO: Send email notification here
    // You would integrate with your email service (e.g., Resend, SendGrid, etc.)
    // await sendInviteEmail(email, invite.token, orgName);

    return NextResponse.json({ invite }, { status: 201 });
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
