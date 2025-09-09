import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { APIError } from '@/types/api';
import type { Database } from '@/types/supabase';

type ApprovalInsert = Database['public']['Tables']['approvals']['Insert'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { billOccurrenceId, decision, notes } = body;

    if (!billOccurrenceId || !decision) {
      return NextResponse.json(
        { error: 'Bill occurrence ID and decision are required' },
        { status: 400 }
      );
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found in any active organization' },
        { status: 403 }
      );
    }

    // Check if user has approval permissions
    if (!['admin', 'approver'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for approval' },
        { status: 403 }
      );
    }

    // Verify bill occurrence exists and belongs to user's org
    const { data: billOccurrence } = await supabase
      .from('bill_occurrences')
      .select('id, bill_id, bills(org_id)')
      .eq('id', billOccurrenceId)
      .single();

    if (
      !billOccurrence ||
      (billOccurrence.bills as any)?.org_id !== userProfile.org_id
    ) {
      return NextResponse.json(
        { error: 'Bill occurrence not found or access denied' },
        { status: 404 }
      );
    }

    // Check if approval already exists
    const { data: existingApproval } = await supabase
      .from('approvals')
      .select('id')
      .eq('bill_occurrence_id', billOccurrenceId)
      .eq('approver_id', user.id)
      .single();

    let result;

    if (existingApproval) {
      // Update existing approval
      const { data, error } = await supabase
        .from('approvals')
        .update({
          decision,
          notes,
        })
        .eq('id', existingApproval.id)
        .select()
        .single();

      if (error)
        throw new APIError('Failed to update approval', 'DATABASE_ERROR');
      result = data;
    } else {
      // Create new approval
      const approvalData: ApprovalInsert = {
        org_id: userProfile.org_id,
        bill_occurrence_id: billOccurrenceId,
        approver_id: user.id,
        decision,
        notes,
      };

      const { data, error } = await supabase
        .from('approvals')
        .insert(approvalData)
        .select()
        .single();

      if (error)
        throw new APIError('Failed to create approval', 'DATABASE_ERROR');
      result = data;
    }

    // Update bill occurrence state based on approval
    let newState:
      | 'scheduled'
      | 'pending_approval'
      | 'approved'
      | 'on_hold'
      | 'paid'
      | 'failed'
      | 'canceled' = 'pending_approval';
    if (decision === 'approved') {
      newState = 'approved';
    } else if (decision === 'hold') {
      newState = 'on_hold';
    } else if (decision === 'rejected') {
      newState = 'canceled';
    }

    await supabase
      .from('bill_occurrences')
      .update({ state: newState })
      .eq('id', billOccurrenceId);

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const billOccurrenceId = searchParams.get('billOccurrenceId');

    if (!billOccurrenceId) {
      return NextResponse.json(
        { error: 'Bill occurrence ID is required' },
        { status: 400 }
      );
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found in any active organization' },
        { status: 403 }
      );
    }

    // Get approvals for the bill occurrence
    const { data: approvals, error } = await supabase
      .from('approvals')
      .select(
        `
        *,
        org_members!approvals_approver_id_fkey(
          user_id,
          users(email, name)
        )
      `
      )
      .eq('bill_occurrence_id', billOccurrenceId)
      .eq('org_id', userProfile.org_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new APIError('Failed to fetch approvals', 'DATABASE_ERROR');
    }

    return NextResponse.json({ data: approvals || [] });
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
