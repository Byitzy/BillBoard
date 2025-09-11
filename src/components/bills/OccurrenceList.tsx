'use client';

import { useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

interface Occurrence {
  id: string;
  sequence: number;
  amount_due: number;
  due_date: string;
  suggested_submission_date: string | null;
  state: string;
}

interface OccurrenceListProps {
  occurrences: Occurrence[];
  loading: boolean;
  onRefresh: () => void;
}

export default function OccurrenceList({
  occurrences,
  loading,
  onRefresh,
}: OccurrenceListProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold">Occurrences</h2>
      {loading ? (
        <div className="text-sm text-neutral-500">Loading...</div>
      ) : occurrences.length === 0 ? (
        <div className="text-sm text-neutral-500">
          No occurrences. Create or adjust the schedule to generate them.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {occurrences.map((occ) => (
            <OccurrenceEditor key={occ.id} occ={occ} onSaved={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function OccurrenceEditor({
  occ,
  onSaved,
}: {
  occ: Occurrence;
  onSaved: () => void;
}) {
  const supabase = getSupabaseClient();
  const [editing, setEditing] = useState(false);
  const [amt, setAmt] = useState(String(occ.amount_due));
  const [due, setDue] = useState(occ.due_date);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-neutral-200 p-3 text-sm shadow-sm dark:border-neutral-800 card-surface">
      {!editing ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="font-medium">
              ${occ.amount_due.toFixed(2)} · Due {occ.due_date}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
                onClick={async () => {
                  setSaving(true);
                  setErr(null);
                  try {
                    const { data: me } = await supabase.auth.getUser();
                    const uid = me.user?.id;
                    if (!uid) throw new Error('Not signed in');
                    await supabase.from('approvals').insert({
                      org_id: (occ as any).org_id,
                      bill_occurrence_id: occ.id,
                      approver_id: uid,
                      decision: 'approved',
                    });
                    await supabase
                      .from('bill_occurrences')
                      .update({ state: 'approved' })
                      .eq('id', occ.id);
                    onSaved();
                  } catch (e: any) {
                    setErr(e.message || 'Failed to approve');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Approve
              </button>
              <button
                className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
                onClick={async () => {
                  setSaving(true);
                  setErr(null);
                  try {
                    const { data: me } = await supabase.auth.getUser();
                    const uid = me.user?.id;
                    if (!uid) throw new Error('Not signed in');
                    await supabase.from('approvals').insert({
                      org_id: (occ as any).org_id,
                      bill_occurrence_id: occ.id,
                      approver_id: uid,
                      decision: 'hold',
                    });
                    await supabase
                      .from('bill_occurrences')
                      .update({ state: 'on_hold' })
                      .eq('id', occ.id);
                    onSaved();
                  } catch (e: any) {
                    setErr(e.message || 'Failed to hold');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Hold
              </button>
              <button
                className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            </div>
          </div>
          {occ.suggested_submission_date && (
            <div className="text-amber-600 dark:text-amber-400">
              Submit by {occ.suggested_submission_date}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="text-xs text-neutral-500">State: {occ.state}</div>
            {occ.state === 'approved' && (
              <button
                className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
                onClick={async () => {
                  setSaving(true);
                  setErr(null);
                  try {
                    await supabase
                      .from('bill_occurrences')
                      .update({ state: 'paid' })
                      .eq('id', occ.id);
                    onSaved();
                  } catch (e: any) {
                    setErr(e.message || 'Failed to mark as paid');
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                Mark as Paid
              </button>
            )}
          </div>
          {err && <div className="text-xs text-red-600">{err}</div>}
        </div>
      ) : (
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setErr(null);
            const n = parseFloat(amt);
            if (Number.isNaN(n)) {
              setErr('Enter a valid amount');
              setSaving(false);
              return;
            }
            const { error } = await supabase
              .from('bill_occurrences')
              .update({
                amount_due: n,
                due_date: due || occ.due_date,
                moved_from_date: occ.due_date,
              })
              .eq('id', occ.id);
            if (error) setErr(error.message);
            else {
              onSaved();
              setEditing(false);
            }
            setSaving(false);
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              className="rounded-xl border border-neutral-200  px-2 py-1 text-sm dark:border-neutral-800"
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              inputMode="decimal"
            />
            <input
              type="date"
              className="rounded-xl border border-neutral-200  px-2 py-1 text-sm dark:border-neutral-800"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>
          {err && <div className="text-xs text-red-600">{err}</div>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
