import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.6';
import { corsHeaders } from '../_shared/cors.ts';

interface Database {
  public: {
    Tables: {
      bills: {
        Row: {
          id: string;
          org_id: string;
          title: string;
          amount_total: number;
          recurring_rule: any;
          installments_total: number | null;
          status: string;
        }
      };
      bill_occurrences: {
        Row: {
          id: string;
          bill_id: string;
          org_id: string;
          sequence: number;
          amount_due: number;
          due_date: string;
          suggested_submission_date: string;
          state: string;
        };
        Insert: {
          bill_id: string;
          org_id: string;
          sequence: number;
          amount_due: number;
          due_date: string;
          suggested_submission_date: string;
          state: string;
        }
      }
    }
  }
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }
  return result;
}

function previousBusinessDay(date: Date): Date {
  const result = new Date(date);
  
  // If it's a weekend, move to previous Friday
  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() - 1);
  }
  
  // TODO: Add Quebec holiday checking here
  // For now, just return the business day
  return result;
}

function generateRecurringDates(startDate: Date, rule: any, horizonMonths: number = 18): Date[] {
  const dates: Date[] = [];
  const endDate = rule.end_date ? new Date(rule.end_date) : 
    new Date(startDate.getFullYear(), startDate.getMonth() + horizonMonths, startDate.getDate());
  
  const current = new Date(startDate);
  const frequency = rule.frequency || 'monthly';
  const interval = rule.interval || 1;
  
  while (current <= endDate && dates.length < 200) { // Safety limit
    dates.push(new Date(current));
    
    switch (frequency) {
      case 'weekly':
        current.setDate(current.getDate() + (7 * interval));
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + interval);
        break;
      case 'yearly':
        current.setFullYear(current.getFullYear() + interval);
        break;
      default:
        throw new Error(`Unsupported frequency: ${frequency}`);
    }
  }
  
  return dates;
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

    const { bill_id } = await req.json();
    
    if (!bill_id) {
      return new Response(
        JSON.stringify({ error: 'bill_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('*')
      .eq('id', bill_id)
      .single();

    if (billError || !bill) {
      return new Response(
        JSON.stringify({ error: 'Bill not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete existing unpaid occurrences for this bill
    await supabase
      .from('bill_occurrences')
      .delete()
      .eq('bill_id', bill_id)
      .neq('state', 'paid'); // Keep paid occurrences

    // If bill has no recurring rule, no occurrences to generate
    if (!bill.recurring_rule) {
      return new Response(
        JSON.stringify({ success: true, generated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rule = bill.recurring_rule;
    const startDate = new Date(rule.start_date || new Date());
    const dates = generateRecurringDates(startDate, rule);
    
    // Calculate amount per occurrence
    const installments = bill.installments_total || dates.length;
    const baseAmount = Math.floor((bill.amount_total * 100) / installments) / 100; // Round down to cents
    const remainder = bill.amount_total - (baseAmount * installments);
    
    const occurrences = dates.map((date, index) => {
      const amount = index === 0 ? baseAmount + remainder : baseAmount; // Add remainder to first installment
      const suggestedDate = previousBusinessDay(new Date(date));
      
      return {
        bill_id: bill.id,
        org_id: bill.org_id,
        sequence: index + 1,
        amount_due: amount,
        due_date: date.toISOString().split('T')[0],
        suggested_submission_date: suggestedDate.toISOString().split('T')[0],
        state: 'scheduled'
      };
    });

    // Insert new occurrences
    const { error: insertError } = await supabase
      .from('bill_occurrences')
      .insert(occurrences);

    if (insertError) {
      console.error('Error inserting occurrences:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate occurrences' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, generated: occurrences.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});