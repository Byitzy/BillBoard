"use client";
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency, ProjectTotal } from '@/lib/metrics';
import { useLocale } from '@/components/i18n/LocaleProvider';

type Props = {
  label: string;
  value: string | number;
  className?: string;
  index?: number;
  tooltip?: string;
  projectBreakdown?: ProjectTotal[];
  href?: string;
};

export default function KPI({ label, value, className, index = 0, tooltip, projectBreakdown, href }: Props) {
  const { t } = useLocale();
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 * index }}
      className={cn('relative group rounded-2xl border border-neutral-200 p-5 shadow-sm dark:border-neutral-800 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:scale-[1.02]', className)}
      onClick={() => {
        if (href) window.location.href = href;
      }}
      role="button"
      aria-label={`Open report for ${label}`}
    >
      <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      {(tooltip || projectBreakdown) && (
        <div className="pointer-events-none absolute -top-16 left-1/2 transform -translate-x-1/2 z-10 hidden w-64 rounded-xl border border-neutral-200 bg-white p-3 text-xs text-neutral-600 shadow-xl group-hover:block dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 transition-opacity duration-200">
          {projectBreakdown && projectBreakdown.length > 0 ? (
            <div className="max-h-60 overflow-y-auto">
              <div className="font-medium mb-2">{t('common.byProject')}</div>
              <div className="space-y-1">
                {projectBreakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="truncate mr-2">{item.project}</span>
                    <span className="font-mono">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : projectBreakdown ? (
            <div>{t('common.noItems')}</div>
          ) : (
            <div>{tooltip}</div>
          )}
        </div>
      )}
    </motion.div>
  );
}
