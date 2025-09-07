"use client";
import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/theme/ThemeProvider';

export default function ProfileSettingsPage() {
  const supabase = getSupabaseClient();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile settings state
  const [locale, setLocale] = useState('en-US');
  const [timezone, setTimezone] = useState('America/Toronto');
  const [dateFormat, setDateFormat] = useState<'iso' | 'us' | 'local'>('local');
  const [currency, setCurrency] = useState('CAD');

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Load user preferences from metadata or default values
        const metadata = user.user_metadata || {};
        if (metadata.theme) setTheme(metadata.theme);
        setLocale(metadata.locale || 'en-US');
        setTimezone(metadata.timezone || 'America/Toronto');
        setDateFormat(metadata.dateFormat || 'local');
        setCurrency(metadata.currency || 'CAD');
      }
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [supabase, setTheme]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function saveSettings() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.auth.updateUser({
        data: {
          theme,
          locale,
          timezone,
          dateFormat,
          currency
        }
      });

      if (error) throw error;

      // Apply theme immediately
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // System theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      }

      setSuccess('Settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  const timezones = [
    'America/Toronto',
    'America/New_York',
    'America/Los_Angeles',
    'America/Chicago',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney'
  ];

  const locales = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-CA', label: 'English (Canada)' },
    { value: 'fr-CA', label: 'Français (Canada)' },
    { value: 'fr-FR', label: 'Français (France)' },
    { value: 'es-ES', label: 'Español' }
  ];

  const currencies = [
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' }
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Profile Settings</h1>
        <div className="animate-pulse rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Profile Settings</h1>

      <div className="space-y-6">
        {/* Theme Settings */}
        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-base font-semibold mb-3">Appearance</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <div className="flex gap-2">
                {[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                  { value: 'billboard', label: 'BillBoard' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value as any)}
                    className={`rounded-xl px-3 py-2 text-sm ${
                      theme === option.value
                        ? 'bg-blue-600 text-white'
                        : 'border border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Localization */}
        <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="text-base font-semibold mb-3">Localization</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
              >
                {locales.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
              >
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date Format</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as any)}
                className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
              >
                <option value="local">Local (MM/DD/YYYY)</option>
                <option value="iso">ISO (YYYY-MM-DD)</option>
                <option value="us">US (MM/DD/YYYY)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
              >
                {currencies.map(curr => (
                  <option key={curr.value} value={curr.value}>{curr.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-600 dark:border-green-900/50 dark:bg-green-900/20">
            {success}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={saveSettings}
          disabled={saving}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
