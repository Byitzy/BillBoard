"use client";
import FeedbackForm from '@/components/FeedbackForm';

export default function UpdatesPage() {
  const updates = [
    {
      title: 'PDF & CSV Export Features',
      body: 'Added comprehensive export functionality to bills and reports. Export your data as PDF reports or CSV files for analysis.',
      date: '2025-09-07'
    },
    {
      title: 'BillBoard mode enters the chat',
      body: 'New brand theme with deep navy and cyan accents. Your retinas wrote us a thank-you note. Switch it in Settings → Profile → Appearance.',
      date: '2025-09-06'
    },
    {
      title: 'Mobile menu: now you see me',
      body: 'Top-left hamburger opens a slide-in sidebar on phones. Magic.',
      date: '2025-09-06'
    },
    {
      title: 'Onboarding + Invites',
      body: 'Create your org, invite teammates by email, pretend you run a tiny empire.',
      date: '2025-09-06'
    }
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Updates & Feedback</h1>
      
      <div className="space-y-3">
        {updates.map((u) => (
          <div key={u.title} className="rounded-2xl border border-neutral-200 p-4 card-surface dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{u.title}</h2>
              <div className="text-xs text-neutral-500">{u.date}</div>
            </div>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{u.body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-neutral-200 p-4 card-surface dark:border-neutral-800">
        <FeedbackForm />
      </div>
    </div>
  );
}

