import DashboardClient from '@/components/DashboardClient';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-neutral-500">Overview of key metrics and recent items.</p>
      </div>
      <DashboardClient />
    </div>
  );
}
