'use client';
import DashboardClient from '@/components/DashboardClient';
import { useLocale } from '@/components/i18n/LocaleProvider';

export default function DashboardPage() {
  const { t } = useLocale();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
        <p className="text-sm text-neutral-500">{t('dashboard.subtitle')}</p>
      </div>
      <DashboardClient />
    </div>
  );
}
