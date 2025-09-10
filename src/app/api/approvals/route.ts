import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  getServerClient,
  getUserFromRequest,
  getServiceClient,
} from '@/lib/supabase/server';
import { APIError } from '@/types/api';
import type { Database } from '@/types/supabase';

type ApprovalInsert = Database['public']['Tables']['approvals']['Insert'];

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = getServiceClient();

    const body = await request.json();
    const { billOccurrenceId, decision, notes } = body;

    if (!billOccurrenceId || !decision) {
      return NextResponse.json(
        { error: 'Bill occurrence ID and decision are required' },
        { status: 400 }
      );
    }

    // Get user's organization using admin client
    const { data: userProfile, error: profileError } = await adminClient
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', user.id)
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

    // Verify bill occurrence exists and belongs to user's org using admin client
    const { data: billOccurrence } = await adminClient
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

    // Check if approval already exists using admin client
    const { data: existingApproval } = await adminClient
      .from('approvals')
      .select('id')
      .eq('bill_occurrence_id', billOccurrenceId)
      .eq('approver_id', user.id)
      .single();

    let result;

    if (existingApproval) {
      // Update existing approval using admin client
      const { data, error } = await adminClient
        .from('approvals')
        .update({
          decision,
          comment: notes,
        })
        .eq('id', existingApproval.id)
        .select()
        .single();

      if (error)
        throw new APIError('Failed to update approval', 'DATABASE_ERROR');
      result = data;
    } else {
      // Create new approval using admin client
      const approvalData: ApprovalInsert = {
        org_id: userProfile.org_id,
        bill_occurrence_id: billOccurrenceId,
        approver_id: user.id,
        decision,
        notes,
      };

      const { data, error } = await adminClient
        .from('approvals')
        .insert({
          ...approvalData,
          comment: approvalData.notes,
          notes: undefined,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: 'Failed to create approval' },
          { status: 500 }
        );
      }
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

    await adminClient
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
      {
        error: 'Internal server error',
        debug: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getServerClient();

    const { searchParams } = new URL(request.url);
    const billOccurrenceId = searchParams.get('billOccurrenceId');

    if (!billOccurrenceId) {
      return NextResponse.json(
        { error: 'Bill occurrence ID is required' },
        { status: 400 }
      );
    }

    // Get user's organization using admin client to bypass RLS
    const adminClient = getServiceClient();
    const { data: userProfile, error: profileError } = await adminClient
      .from('org_members')
      .select('org_id, user_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found in any active organization' },
        { status: 403 }
      );
    }

    // First check if bill occurrence exists at all using admin client
    const { data: billOccurrence, error: billError } = await adminClient
      .from('bill_occurrences')
      .select('id, bill_id, org_id')
      .eq('id', billOccurrenceId)
      .single();

    if (billError) {
      return NextResponse.json(
        { error: 'Bill occurrence not found' },
        { status: 403 }
      );
    }

    if (!billOccurrence) {
      return NextResponse.json(
        { error: 'Bill occurrence not found' },
        { status: 403 }
      );
    }

    // Check org ownership directly from bill_occurrences table
    if (billOccurrence.org_id !== userProfile.org_id) {
      return NextResponse.json(
        { error: 'Access denied - different organization' },
        { status: 403 }
      );
    }

    // Get approvals for the bill occurrence using admin client (no ORDER BY)
    const { data: approvals, error } = await adminClient
      .from('approvals')
      .select('*')
      .eq('bill_occurrence_id', billOccurrenceId)
      .eq('org_id', userProfile.org_id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch approvals' },
        { status: 500 }
      );
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
