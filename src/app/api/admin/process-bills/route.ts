import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('org_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get today's date in ISO format (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];

    // Find all scheduled bills where due_date is today or earlier, including bill auto_approve setting
    const { data: billsToProcess, error: queryError } = await supabase
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
      const { error } = await supabase
        .from('bill_occurrences')
        .update({ state: 'approved' })
        .in('id', approveNowIds);
      if (error) updateErrors.push(error);
    }

    // Update bills that should go to pending approval
    if (pendingApprovalIds.length > 0) {
      const { error } = await supabase
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
