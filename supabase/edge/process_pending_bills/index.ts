import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.6';
import { corsHeaders } from '../_shared/cors.ts';

interface Database {
  public: {
    Tables: {
      bill_occurrences: {
        Row: {
          id: string;
          org_id: string;
          bill_id: string;
          due_date: string;
          state: string;
        };
        Update: {
          state?: string;
        };
      };
      bills: {
        Row: {
          id: string;
          org_id: string;
          auto_approve: boolean;
        };
      };
    };
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get today's date in ISO format (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];

    console.log(`Processing bills for date: ${today}`);

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
      console.error('Error querying bills:', queryError);
      return new Response(JSON.stringify({ error: 'Failed to query bills' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const billsProcessed = billsToProcess?.length || 0;
    console.log(`Found ${billsProcessed} bills to process`);

    if (billsProcessed === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No bills to process today',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
    let updateErrors: any[] = [];
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
      console.error('Error updating bills:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update bill states' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `Successfully processed ${billsProcessed} bills: ${approveNowIds.length} auto-approved, ${pendingApprovalIds.length} pending approval`
    );

    // TODO: Send notifications to approvers for bills needing approval
    // This could be integrated with the notification system

    return new Response(
      JSON.stringify({
        success: true,
        processed: billsProcessed,
        auto_approved: approveNowIds.length,
        pending_approval: pendingApprovalIds.length,
        message: `Successfully processed ${billsProcessed} bills: ${approveNowIds.length} auto-approved, ${pendingApprovalIds.length} require approval`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
