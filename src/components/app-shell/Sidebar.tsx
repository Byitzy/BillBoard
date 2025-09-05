"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BarChart3, LayoutDashboard, Settings, Folder, FileText, Layers } from 'lucide-react';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/section-a', label: 'Section A', icon: Layers },
  { href: '/section-b', label: 'Section B', icon: Folder },
  { href: '/section-c', label: 'Section C', icon: FileText },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings/profile', label: 'Settings', icon: Settings }
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside aria-label="Primary" className="sticky top-0 h-dvh w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-800 hidden lg:block">
      <div className="p-4">
        <div className="mb-6 text-sm font-semibold tracking-wide text-neutral-700 dark:text-neutral-300">Admin UI</div>
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
                    ? 'bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50'
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

