import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'approver', 'accountant', 'data_entry', 'analyst', 'viewer'])
});

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: invites, error } = await supabase
      .from('org_invites')
      .select(`
        id,
        email,
        role,
        created_at,
        expires_at,
        accepted_at,
        invited_by:auth.users!invited_by(email)
      `)
      .eq('org_id', params.orgId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invites });
  } catch (error) {
    console.error('Error fetching invites:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, role } = inviteSchema.parse(body);

    // Check if user already exists in org
    const { data: existingMember } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', params.orgId)
      .eq('user_id', session.user.id)
      .single();

    if (!existingMember) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    // Create the invite
    const { data: invite, error } = await supabase
      .from('org_invites')
      .insert({
        org_id: params.orgId,
        email,
        role,
        invited_by: session.user.id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'User already invited or is a member' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // TODO: Send email notification here
    // You would integrate with your email service (e.g., Resend, SendGrid, etc.)
    // await sendInviteEmail(email, invite.token, orgName);

    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error creating invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}