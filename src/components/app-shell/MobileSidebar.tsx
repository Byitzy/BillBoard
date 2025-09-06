"use client";
import Link from 'next/link';
import type { Route } from 'next';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type Item = { href: Route; label: string };

const items = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/bills', label: 'Bills' },
  { href: '/vendors', label: 'Vendors' },
  { href: '/projects', label: 'Projects' },
  { href: '/updates', label: 'Updates' },
  { href: '/settings/profile', label: 'Settings' }
] as const satisfies ReadonlyArray<Item>;

export default function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  return (
    <div
      className={cn(
        'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden',
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
      onClick={onClose}
    >
      <aside
        className={cn(
          'absolute left-0 top-0 h-full w-72 card-surface border-r p-4 transform transition-transform',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="https://aytzgpwkjmdgznxxtrdd.supabase.co/storage/v1/object/public/brand/BillBoard_icon.jpg"
              alt="BillBoard"
              className="h-7 w-7 rounded-md object-cover"
            />
            <div className="text-sm font-semibold">BillBoard</div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-neutral-100 dark:hover:bg-neutral-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={onClose}
              className={cn(
                'block rounded-xl px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900',
                pathname?.startsWith(it.href) && 'bg-[hsl(var(--surface))]'
              )}
            >
              {it.label}
            </Link>
          ))}
        </nav>
      </aside>
    </div>
  );
}
