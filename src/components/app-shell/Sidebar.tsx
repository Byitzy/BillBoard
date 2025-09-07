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
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import { useLocale } from '@/components/i18n/LocaleProvider';
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

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const nav = getNav(t);

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
          <div className="text-base font-semibold tracking-wide">BillBoard</div>
        </div>
        <nav className="space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm outline-none ring-0 focus-visible:ring-2 ring-blue-500',
                  active
                    ? 'bg-[hsl(var(--surface))] text-[hsl(var(--text))]'
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
