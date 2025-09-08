'use client';
import {
  Bell,
  ChevronDown,
  Plus,
  Search,
  LogIn,
  LogOut,
  Menu,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase/client';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
import MobileSidebar from '@/components/app-shell/MobileSidebar';
import { useLocale } from '@/components/i18n/LocaleProvider';
import NotificationCenter from '@/components/NotificationCenter';

export default function Topbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = getSupabaseClient();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLocale();

  // Get context-aware search placeholder
  const getSearchPlaceholder = () => {
    if (pathname.startsWith('/bills')) return 'Search bills...';
    if (pathname.startsWith('/vendors')) return 'Search vendors...';
    if (pathname.startsWith('/projects')) return 'Search projects...';
    return 'Search...';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Redirect to appropriate page with search query
    if (pathname.startsWith('/bills')) {
      router.push(`/bills?search=${encodeURIComponent(searchQuery)}`);
    } else if (pathname.startsWith('/vendors')) {
      router.push(`/vendors?search=${encodeURIComponent(searchQuery)}`);
    } else if (pathname.startsWith('/projects')) {
      router.push(`/projects?search=${encodeURIComponent(searchQuery)}`);
    } else {
      // Default to bills search
      router.push(`/bills?search=${encodeURIComponent(searchQuery)}`);
    }

    setSearchQuery('');
  };

  useEffect(() => {
    supabase.auth.getSession().then((res) => setSignedIn(!!res.data.session));
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_e: string, session: Session | null) => setSignedIn(!!session)
    );
    return () => sub.subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Close menus on route change to avoid overlay trapping clicks
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);
  return (
    <header
      className="sticky top-0 z-10 bg-[hsl(var(--surface))]/80 backdrop-blur"
      style={{ borderBottom: '1px solid hsl(var(--border))' }}
    >
      <div className="container-page flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <button
            className="lg:hidden rounded-xl p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
              aria-hidden
            />
            <input
              aria-label="Search"
              placeholder={getSearchPlaceholder()}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white pl-8 pr-3 py-2 text-sm outline-none ring-0 focus-visible:ring-2 ring-blue-500 dark:bg-neutral-950 dark:border-neutral-800"
            />
          </form>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 ring-blue-500"
            >
              <Plus className="h-4 w-4" /> {t('common.new')}{' '}
              <ChevronDown className="h-4 w-4" />
            </button>
            {menuOpen && (
              <ul
                role="menu"
                className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setMenuOpen(false);
                }}
              >
                {[
                  { label: 'Add Bill', href: '/bills' as const },
                  { label: 'Add Vendor', href: '/vendors' as const },
                  { label: 'Add Project', href: '/projects' as const },
                ].map((item) => (
                  <li key={item.label} role="menuitem">
                    <Link
                      href={item.href}
                      className="w-full rounded-lg px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 block"
                      onClick={() => setMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <NotificationCenter />
          {signedIn ? (
            <button
              aria-label="Sign out"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/login';
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
          <MobileSidebar
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
          />
        </div>
      )}
    </header>
  );
}
