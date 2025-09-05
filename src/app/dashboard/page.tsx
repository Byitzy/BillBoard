export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded border border-neutral-200 dark:border-neutral-800 p-4">This Month Due</div>
        <div className="rounded border border-neutral-200 dark:border-neutral-800 p-4">Approved</div>
        <div className="rounded border border-neutral-200 dark:border-neutral-800 p-4">Paid</div>
      </div>
    </div>
  );
}

