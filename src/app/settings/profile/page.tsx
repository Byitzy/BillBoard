"use client";
import { useTheme } from '@/components/theme/ThemeProvider';

export default function ProfileSettingsPage() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Profile Settings</h1>
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 card-surface space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Appearance</h2>
          <p className="text-xs text-neutral-500">Choose your color theme.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
            { key: 'system', label: 'System' },
            { key: 'billboard', label: 'BillBoard' }
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key as any)}
              className={`rounded-xl border px-3 py-2 text-sm ${
                theme === t.key ? 'bg-[hsl(var(--surface))] ring-2 ring-[hsl(var(--accent))]' : 'hover:bg-neutral-100 dark:hover:bg-neutral-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 card-surface">Locale and timezone (coming soon)</div>
    </div>
  );
}
