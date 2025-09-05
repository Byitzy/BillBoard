import Link from 'next/link';

export default function BillsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bills</h1>
        <button className="rounded bg-blue-600 text-white px-3 py-1 text-sm">New Bill</button>
      </div>
      <div className="rounded border border-neutral-200 dark:border-neutral-800 p-4 text-sm">
        Placeholder table. Go to <Link href="/bills/00000000-0000-0000-0000-000000000000">a bill</Link>.
      </div>
    </div>
  );
}

