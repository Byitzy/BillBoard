import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper function to check if user is admin
async function isAdmin(
  authHeader: string | null
): Promise<{ isAdmin: boolean; userId?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAdmin: false };
  }

  const token = authHeader.substring(7);

  try {
    const {
      data: { user },
      error,
    } = await adminClient.auth.getUser(token);
    if (error || !user) return { isAdmin: false };

    // Check if user is admin in any organization
    const { data: userProfile } = await adminClient
      .from('org_members')
      .select('role, org_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('role', 'admin')
      .single();

    return {
      isAdmin: !!userProfile,
      userId: user.id,
    };
  } catch (error) {
    return { isAdmin: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { isAdmin: userIsAdmin, userId } = await isAdmin(authHeader);

    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    // Get today's date in ISO format (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];

    // Find all scheduled bills where due_date is today or earlier, including bill auto_approve setting
    const { data: billsToProcess, error: queryError } = await adminClient
      .from('bill_occurrences')
      .select(
        `
        id, 
        org_id, 
        bill_id, 
        due_date, 
        state,
        bills!inner (
          id,
          auto_approve
        )
      `
      )
      .eq('state', 'scheduled')
      .lte('due_date', today);

    if (queryError) {
      return NextResponse.json(
        { error: 'Failed to query bills' },
        { status: 500 }
      );
    }

    const billsProcessed = billsToProcess?.length || 0;

    if (billsProcessed === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No bills to process today',
      });
    }

    // Process each bill based on its auto_approve setting
    const approveNowIds: string[] = [];
    const pendingApprovalIds: string[] = [];

    billsToProcess!.forEach((bill: any) => {
      if (bill.bills.auto_approve) {
        approveNowIds.push(bill.id);
      } else {
        pendingApprovalIds.push(bill.id);
      }
    });

    // Update bills that should be auto-approved
    const updateErrors: any[] = [];
    if (approveNowIds.length > 0) {
      const { error } = await adminClient
        .from('bill_occurrences')
        .update({ state: 'approved' })
        .in('id', approveNowIds);
      if (error) updateErrors.push(error);
    }

    // Update bills that should go to pending approval
    if (pendingApprovalIds.length > 0) {
      const { error } = await adminClient
        .from('bill_occurrences')
        .update({ state: 'pending_approval' })
        .in('id', pendingApprovalIds);
      if (error) updateErrors.push(error);
    }

    const updateError = updateErrors.length > 0 ? updateErrors[0] : null;

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update bill states' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      processed: billsProcessed,
      auto_approved: approveNowIds.length,
      pending_approval: pendingApprovalIds.length,
      message: `Successfully processed ${billsProcessed} bills: ${approveNowIds.length} auto-approved, ${pendingApprovalIds.length} require approval`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
