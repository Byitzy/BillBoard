"use client";
import FeedbackForm from '@/components/FeedbackForm';

export default function UpdatesPage() {
  const updates = [
    {
      title: 'PDF & CSV Export Features',
      body: 'Added comprehensive export functionality to bills and reports. Export your data as PDF reports or CSV files for analysis.',
      date: '2025-09-07',
      category: 'feature'
    },
    {
      title: 'BillBoard mode enters the chat',
      body: 'New brand theme with deep navy and cyan accents. Your retinas wrote us a thank-you note. Switch it in Settings → Profile → Appearance.',
      date: '2025-09-06',
      category: 'feature'
    },
    {
      title: 'Mobile menu: now you see me',
      body: 'Top-left hamburger opens a slide-in sidebar on phones. Magic.',
      date: '2025-09-06',
      category: 'feature'
    },
    {
      title: 'Onboarding + Invites',
      body: 'Create your org, invite teammates by email, pretend you run a tiny empire.',
      date: '2025-09-06',
      category: 'feature'
    },
    {
      title: 'Bills: smarter creation',
      body: 'Search-or-create vendors and projects as you type. Choose currency. One-off or recurring with weekly/bi-weekly/monthly/quarterly/annual options. Notes and status included.',
      date: '2025-09-06',
      category: 'enhancement'
    }
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Updates & Feedback</h1>
      
      <div className="rounded-2xl border border-neutral-200 p-4 card-surface dark:border-neutral-800">
        <FeedbackForm />
      </div>

      <div className="space-y-3">
        {updates.map((u) => (
          <div key={u.title} className="rounded-2xl border border-neutral-200 p-4 card-surface dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">{u.title}</h2>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                  u.category === 'feature' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                  u.category === 'enhancement' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  u.category === 'bug' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                }`}>
                  {u.category}
                </span>
              </div>
              <div className="text-xs text-neutral-500">{u.date}</div>
            </div>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{u.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
