'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark' | 'system' | 'billboard';

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = (typeof window !== 'undefined' &&
      localStorage.getItem('theme')) as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    // clear previous theme classes
    root.classList.remove('dark');
    root.classList.remove('billboard');
    if (theme === 'dark' || (theme === 'system' && prefersDark)) {
      root.classList.add('dark');
    } else if (theme === 'billboard') {
      root.classList.add('billboard');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

// Inline script to set initial theme class ASAP to avoid flash
export function ThemeScript() {
  const code = `
  (()=>{
    try {
      const stored = localStorage.getItem('theme');
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const prefersDark = mql.matches;
      const allowed = ['light','dark','system','billboard'];
      const theme = allowed.includes(stored || '') ? stored : 'system';
      const root = document.documentElement;
      root.classList.remove('dark');
      root.classList.remove('billboard');
      if (theme === 'dark' || (theme === 'system' && prefersDark)) root.classList.add('dark');
      else if (theme === 'billboard') root.classList.add('billboard');
    } catch {}
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
