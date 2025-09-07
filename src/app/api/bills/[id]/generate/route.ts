import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { generateOccurrences, type Bill } from '@/lib/occurrences';
import { getServiceClient, getUserFromRequest } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const billId = params.id;
  const admin = getServiceClient();

  // AuthZ: require user to be a member of the bill's org
  const user = await getUserFromRequest(req);
  if (!user)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: bill, error: billErr } = await admin
    .from('bills')
    .select(
      'id, org_id, project_id, vendor_id, title, amount_total, currency, due_date, recurring_rule, installments_total'
    )
    .eq('id', billId)
    .single();
  if (billErr || !bill)
    return NextResponse.json(
      { error: billErr?.message || 'bill not found' },
      { status: 404 }
    );

  const { data: me, error: meErr } = await admin
    .from('org_members')
    .select('id')
    .eq('org_id', bill.org_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (meErr)
    return NextResponse.json({ error: meErr.message }, { status: 400 });
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Generate occurrences using shared logic
  const occ = generateOccurrences({
    id: bill.id,
    org_id: bill.org_id,
    project_id: bill.project_id,
    vendor_id: bill.vendor_id,
    title: bill.title,
    amount_total: Number(bill.amount_total),
    due_date: bill.due_date,
    recurring_rule: bill.recurring_rule as Bill['recurring_rule'],
    installments_total: bill.installments_total,
  });

  // Fetch existing to preserve states for paid/failed/approved
  const { data: existing } = await admin
    .from('bill_occurrences')
    .select('id, sequence, state')
    .eq('bill_id', billId);

  const stateMap = new Map<number, string>();
  existing?.forEach((e) => stateMap.set(e.sequence, e.state));

  const upserts = occ.map((o) => ({
    org_id: bill.org_id,
    bill_id: bill.id,
    project_id: bill.project_id,
    vendor_id: bill.vendor_id,
    sequence: o.sequence,
    amount_due: o.amount_due,
    due_date: o.due_date,
    suggested_submission_date: o.suggested_submission_date,
    state: preserveState(stateMap.get(o.sequence)) as any,
  }));

  // Upsert by (bill_id, sequence)
  const { error: upErr } = await admin
    .from('bill_occurrences')
    .upsert(upserts, { onConflict: 'bill_id,sequence' });
  if (upErr)
    return NextResponse.json({ error: upErr.message }, { status: 400 });

  // Optionally prune excess scheduled occurrences beyond new length
  const maxSeq = Math.max(0, ...occ.map((o) => o.sequence));
  await admin
    .from('bill_occurrences')
    .delete()
    .eq('bill_id', bill.id)
    .gt('sequence', maxSeq)
    .eq('state', 'scheduled');

  return NextResponse.json({ ok: true, count: upserts.length });
}

function preserveState(prev: string | undefined) {
  if (!prev) return 'scheduled';
  if (
    prev === 'paid' ||
    prev === 'failed' ||
    prev === 'approved' ||
    prev === 'on_hold'
  )
    return prev;
  return 'scheduled';
}
