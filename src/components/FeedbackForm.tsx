'use client';
import { Bug, Lightbulb, Plus, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function FeedbackForm() {
  const supabase = getSupabaseClient();
  const [type, setType] = useState<'bug' | 'feature' | 'idea'>('feature');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Please sign in to submit feedback');

      // Get organization ID if available
      const orgId = await getDefaultOrgId(supabase);

      const { error: err } = await supabase.from('feedback').insert({
        type,
        title: title.trim(),
        body: body.trim() || null,
        author_id: userData.user.id,
        org_id: orgId || null,
      });

      if (err) throw err;

      setSubmitted(true);
      setTitle('');
      setBody('');
      setType('feature');

      // Clear success message after a delay
      setTimeout(() => setSubmitted(false), 5000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center dark:bg-green-900/20">
            <Check className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <h2 className="text-lg font-semibold mb-2">
          Thank you for your feedback!
        </h2>
        <p className="text-sm text-neutral-500 mb-4">
          We&apos;ll review it and get back to you if needed. Your input helps
          make BillBoard better.
        </p>
        <button
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
          onClick={() => setSubmitted(false)}
        >
          <Plus className="w-4 h-4" />
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Submit Feedback</h2>
        <p className="text-xs text-neutral-500">Help us improve BillBoard</p>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              value: 'bug',
              label: 'Bug Report',
              icon: Bug,
              color: 'text-red-600',
            },
            {
              value: 'feature',
              label: 'Feature Request',
              icon: Plus,
              color: 'text-blue-600',
            },
            {
              value: 'idea',
              label: 'General Idea',
              icon: Lightbulb,
              color: 'text-yellow-600',
            },
          ].map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                className={`rounded-xl px-3 py-3 text-sm border transition-colors ${
                  type === opt.value
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700'
                    : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900'
                }`}
                onClick={() => setType(opt.value as any)}
              >
                <div className="flex flex-col items-center gap-1">
                  <Icon
                    className={`w-5 h-5 ${type === opt.value ? 'text-blue-600' : opt.color}`}
                  />
                  <span className="text-xs font-medium">{opt.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder={`${type === 'bug' ? 'Describe the bug...' : type === 'feature' ? 'What feature would you like?' : 'Share your idea...'}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-neutral-200  px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-800"
            required
            maxLength={200}
          />

          <textarea
            placeholder={`${type === 'bug' ? 'Steps to reproduce, what you expected, screenshots...' : type === 'feature' ? 'How would this feature work? What problem does it solve?' : 'Tell us more about your idea...'}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-xl border border-neutral-200  px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-800 resize-none"
            rows={4}
            maxLength={2000}
          />
          <div className="text-xs text-neutral-500 text-right">
            {body.length}/2000 characters
          </div>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <button
        type="submit"
        disabled={submitting || !title.trim()}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Submitting…
          </>
        ) : (
          'Submit Feedback'
        )}
      </button>
    </form>
  );
}
