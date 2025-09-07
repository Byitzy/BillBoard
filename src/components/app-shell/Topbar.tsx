"use client";
import { Bell, ChevronDown, Plus, Search, LogIn, LogOut, Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
import MobileSidebar from '@/components/app-shell/MobileSidebar';

export default function Topbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const supabase = getSupabaseClient();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then((res) => setSignedIn(!!res.data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e: string, session: Session | null) =>
      setSignedIn(!!session)
    );
    return () => sub.subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Close menus on route change to avoid overlay trapping clicks
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);
  return (
    <header className="sticky top-0 z-10 bg-[hsl(var(--surface))]/80 backdrop-blur" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
      <div className="container-page flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <button
            className="lg:hidden rounded-xl p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" aria-hidden />
          <input
            aria-label="Search"
            placeholder="Search"
            className="w-full rounded-xl border border-neutral-200 bg-white pl-8 pr-3 py-2 text-sm outline-none ring-0 focus-visible:ring-2 ring-blue-500 dark:bg-neutral-950 dark:border-neutral-800"
          />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 ring-blue-500"
            >
              <Plus className="h-4 w-4" /> New <ChevronDown className="h-4 w-4" />
            </button>
            {menuOpen && (
              <ul
                role="menu"
                className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-neutral-200 bg-[hsl(var(--surface))] p-1 text-sm shadow-sm dark:border-neutral-800"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setMenuOpen(false);
                }}
              >
                {['Item One', 'Item Two', 'Item Three'].map((label) => (
                  <li key={label} role="menuitem">
                    <button
                      className={cn(
                        'w-full rounded-lg px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      )}
                      onClick={() => setMenuOpen(false)}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button aria-label="Notifications" className="rounded-xl p-2 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 ring-blue-500 dark:hover:bg-neutral-900">
            <Bell className="h-5 w-5" />
          </button>
          {signedIn ? (
            <button
              aria-label="Sign out"
              onClick={async () => {
                await supabase.auth.signOut();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 p-2 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 ring-blue-500 dark:border-neutral-800 dark:hover:bg-neutral-900"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Sign out</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 p-2 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 ring-blue-500 dark:border-neutral-800 dark:hover:bg-neutral-900"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Sign in</span>
            </Link>
          )}
        </div>
      </div>
      {mobileOpen && (
        <div className="lg:hidden">
          <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
        </div>
      )}
    </header>
  );
}
