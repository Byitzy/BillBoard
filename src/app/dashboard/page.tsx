import KPI from '@/components/kpi/KPI';
import RentLine from '@/components/charts/RentLine';
import { KPIS, ROWS, CHART } from '@/lib/data';
import { MoreHorizontal } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-neutral-500">Overview of key metrics and recent items.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k, i) => (
          <KPI key={k.label} label={k.label} value={k.value} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Items Overview</h2>
              <p className="text-xs text-neutral-500">Recent items with status and amount</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="text-left" role="row">
                  {['Name', 'Owner', 'Status', 'Amount', 'Actions'].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 text-neutral-500" role="columnheader">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.name} role="row" className="border-t border-neutral-100 dark:border-neutral-800">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.owner}</td>
                    <td className="px-3 py-2">{r.status}</td>
                    <td className="px-3 py-2">{r.amount}</td>
                    <td className="px-3 py-2">
                      <details className="relative">
                        <summary className="list-none inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900 cursor-pointer select-none">
                          Actions <MoreHorizontal className="h-4 w-4" />
                        </summary>
                        <ul className="absolute z-10 mt-2 w-36 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 text-sm shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                          {['View', 'Edit', 'Archive'].map((label) => (
                            <li key={label}>
                              <button className="w-full rounded-lg px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                {label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-800">
          <div>
            <h2 className="text-base font-semibold">Monthly Metric</h2>
            <p className="text-xs text-neutral-500">Last 7 months</p>
          </div>
          <RentLine data={CHART} />
        </div>
      </div>
    </div>
  );
}
