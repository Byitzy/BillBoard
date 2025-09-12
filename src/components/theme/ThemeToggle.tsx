'use client';
import { Moon, Sun, Monitor } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { useTheme } from './ThemeProvider';

const BILLBOARD_ICON =
  'https://aytzgpwkjmdgznxxtrdd.supabase.co/storage/v1/object/public/brand/BillBoard_icon.jpg';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const items: {
    key: 'light' | 'dark' | 'system' | 'billboard';
    label: string;
    icon: React.ReactNode;
  }[] = [
    { key: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
    { key: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
    { key: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> },
    {
      key: 'billboard',
      label: 'BillBoard',
      icon: (
        <Image
          src={BILLBOARD_ICON}
          alt="BillBoard"
          width={16}
          height={16}
          className="h-4 w-4 rounded-sm object-cover"
        />
      ),
    },
  ];

  const active = items.find((i) => i.key === theme) ?? items[2];

  return (
    <div className="relative">
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 p-2 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 ring-blue-500 dark:border-neutral-800 dark:hover:bg-neutral-900"
        onClick={() => setOpen((v) => !v)}
      >
        {active.icon}
        <span className="hidden sm:inline text-sm">{active.label}</span>
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 mt-2 w-36 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          {items.map((i) => (
            <li key={i.key} role="menuitem">
              <button
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 inline-flex items-center gap-2"
                onClick={() => {
                  setTheme(i.key);
                  setOpen(false);
                }}
              >
                {i.icon}
                {i.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
