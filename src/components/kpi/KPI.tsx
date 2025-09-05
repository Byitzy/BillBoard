"use client";
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  value: string | number;
  className?: string;
  index?: number;
};

export default function KPI({ label, value, className, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 * index }}
      className={cn('rounded-2xl border border-neutral-200 p-5 shadow-sm dark:border-neutral-800', className)}
    >
      <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
    </motion.div>
  );
}

