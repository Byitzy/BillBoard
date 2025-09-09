'use client';
import {
  BarChart3,
  LayoutDashboard,
  Settings,
  Folder,
  FileText,
  Layers,
  CalendarDays,
  CheckSquare,
  Crown,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { getSupabaseClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const getNav = (t: (key: any) => string) =>
  [
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/calendar', label: t('nav.calendar'), icon: CalendarDays },
    { href: '/bills', label: t('nav.bills'), icon: FileText },
    { href: '/approvals' as Route, label: 'Approvals', icon: CheckSquare },
    { href: '/vendors', label: t('nav.vendors'), icon: Layers },
    { href: '/projects', label: t('nav.projects'), icon: Folder },
    { href: '/updates', label: t('nav.updates'), icon: BarChart3 },
    { href: '/settings/profile', label: t('nav.settings'), icon: Settings },
  ] as const;

const getSuperAdminNav = () =>
  [
    {
      href: '/super-admin' as Route,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    { href: '/super-admin/users' as Route, label: 'Manage Users', icon: Crown },
    {
      href: '/super-admin/organizations' as Route,
      label: 'Organizations',
      icon: BarChart3,
    },
    { href: '/settings/profile', label: 'Profile Settings', icon: Settings },
  ] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    let mounted = true;
    async function checkSuperAdmin() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (
          mounted &&
          (session?.user?.user_metadata?.is_super_admin === true ||
            session?.user?.user_metadata?.is_super_admin === 'true')
        ) {
          setIsSuperAdmin(true);
        }
      } catch (error) {
        // Handle auth error silently
      }
    }
    checkSuperAdmin();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // Determine which navigation to show
  const nav = isSuperAdmin ? getSuperAdminNav() : getNav(t);

  return (
    <aside
      aria-label="Primary"
      className="sticky top-0 h-dvh w-64 shrink-0 border-r hidden lg:block card-surface"
    >
      <div
        className="p-4"
        style={{ borderRight: '1px solid hsl(var(--border))' }}
      >
        <div className="mb-6 flex items-center gap-3">
          <img
            src="https://aytzgpwkjmdgznxxtrdd.supabase.co/storage/v1/object/public/brand/BillBoard_icon.jpg"
            alt="BillBoard"
            className="h-8 w-8 rounded-md object-cover shadow-sm"
          />
          <div className="text-base font-semibold tracking-wide">
            {isSuperAdmin ? 'BillBoard Admin' : 'BillBoard'}
          </div>
        </div>
        <nav className="space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== '/super-admin' && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm outline-none ring-0 focus-visible:ring-2 ring-blue-500',
                  active
                    ? isSuperAdmin
                      ? 'bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 text-purple-700 dark:text-purple-300'
                      : 'bg-[hsl(var(--surface))] text-[hsl(var(--text))]'
                    : isSuperAdmin
                      ? 'text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20'
                      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-900'
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
