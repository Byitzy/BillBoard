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
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
      <div className="p-4 border-b border-neutral-100 dark:border-neutral-800">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Bill Occurrences
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Individual instances of this bill with their own status and due dates
        </p>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-sm text-neutral-500 p-4 text-center">
            Loading occurrences...
          </div>
        ) : occurrences.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 17.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              No occurrences yet
            </p>
            <p className="text-neutral-500 dark:text-neutral-400">
              Create or adjust the schedule to generate bill occurrences.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {occurrences.map((occ) => (
              <OccurrenceEditor key={occ.id} occ={occ} onSaved={onRefresh} />
            ))}
          </div>
        )}
      </div>
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

  // Helper function to get status color and icon
  function getStatusInfo(status: string) {
    switch (status) {
      case 'pending_approval':
        return {
          color:
            'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
          icon: '⏳',
          label: 'Pending Approval',
        };
      case 'approved':
        return {
          color:
            'text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
          icon: '✅',
          label: 'Approved',
        };
      case 'paid':
        return {
          color:
            'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
          icon: '💳',
          label: 'Paid',
        };
      case 'on_hold':
        return {
          color:
            'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
          icon: '⏸️',
          label: 'On Hold',
        };
      default:
        return {
          color:
            'text-neutral-600 bg-neutral-50 border-neutral-200 dark:bg-neutral-950 dark:border-neutral-800',
          icon: '📄',
          label: status.charAt(0).toUpperCase() + status.slice(1),
        };
    }
  }

  const statusInfo = getStatusInfo(occ.state);

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 bg-neutral-50 dark:bg-neutral-800/50">
      {!editing ? (
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
                  ${occ.amount_due.toFixed(2)}
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}
                >
                  <span>{statusInfo.icon}</span>
                  {statusInfo.label}
                </span>
              </div>

              <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
                <div>
                  <span className="font-medium">Due:</span>{' '}
                  {new Date(occ.due_date).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Sequence:</span> #{occ.sequence}
                </div>
                {occ.suggested_submission_date && (
                  <div className="text-amber-600 dark:text-amber-400">
                    <span className="font-medium">Submit by:</span>{' '}
                    {occ.suggested_submission_date}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 ml-4">
              {occ.state === 'pending_approval' && (
                <>
                  <button
                    disabled={saving}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                    ✅ Approve
                  </button>
                  <button
                    disabled={saving}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                    ⏸️ Hold
                  </button>
                </>
              )}

              {occ.state === 'approved' && (
                <button
                  disabled={saving}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                  💳 Mark as Paid
                </button>
              )}

              <button
                className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg"
                onClick={() => setEditing(true)}
              >
                ✏️ Edit
              </button>
            </div>
          </div>

          {err && (
            <div className="text-xs text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-950 rounded-lg">
              {err}
            </div>
          )}
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
