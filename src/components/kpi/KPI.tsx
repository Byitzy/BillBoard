"use client";
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: string | number;
  className?: string;
  index?: number;
  tooltip?: string;
  href?: string;
};

export default function KPI({ label, value, className, index = 0, tooltip, href }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 * index }}
      className={cn('relative group rounded-2xl border border-neutral-200 p-5 shadow-sm dark:border-neutral-800 cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md', className)}
      onClick={() => {
        if (href) window.location.href = href;
      }}
      role="button"
      aria-label={`Open report for ${label}`}
    >
      <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      {tooltip && (
        <div className="pointer-events-none absolute right-2 top-2 hidden w-44 rounded-xl border border-neutral-200 bg-[hsl(var(--surface))] p-2 text-xs text-neutral-600 shadow-lg group-hover:block dark:border-neutral-800 dark:text-neutral-300">
          {tooltip}
        </div>
      )}
    </motion.div>
  );
}
