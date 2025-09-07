'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Locale, TranslationKey } from '@/lib/i18n';
import { setLocale as setGlobalLocale, t } from '@/lib/i18n';
import { getSupabaseClient } from '@/lib/supabase/client';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en-US');
  const supabase = getSupabaseClient();

  useEffect(() => {
    // Load saved locale from user preferences
    async function loadLocale() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.user_metadata?.locale) {
          const userLocale = user.user_metadata.locale as Locale;
          setLocale(userLocale);
          setGlobalLocale(userLocale);
        }
      } catch (error) {
        console.warn('Failed to load user locale:', error);
      }
    }
    loadLocale();
  }, [supabase]);

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    setGlobalLocale(newLocale);
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale: handleSetLocale,
      t,
    }),
    [locale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
