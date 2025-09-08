'use client';
import RentLine from '@/components/charts/RentLine';

type ChartPoint = { m: string; v: number };
type Row = {
  id: string;
  vendor?: string | null;
  project?: string | null;
  due_date: string;
  amount_due: number;
  state: string;
};

interface DashboardChartsProps {
  chart: ChartPoint[];
  rows: Row[];
  loading: boolean;
}

export default function DashboardCharts({
  chart,
  rows,
  loading,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-3 rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Upcoming Occurrences</h2>
            <p className="text-xs text-neutral-500">Next 10 upcoming</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="text-left" role="row">
                {['Due', 'Amount', 'State'].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-3 py-2 text-neutral-500"
                    role="columnheader"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-2" colSpan={3}>
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-neutral-500" colSpan={3}>
                    Nothing coming up.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    role="row"
                    className="border-t border-neutral-100 dark:border-neutral-800"
                  >
                    <td className="px-3 py-2">{r.due_date}</td>
                    <td className="px-3 py-2">${r.amount_due.toFixed(2)}</td>
                    <td className="px-3 py-2">{r.state}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-neutral-200 p-4 shadow-sm dark:border-neutral-800">
        <div>
          <h2 className="text-base font-semibold">Monthly Totals</h2>
          <p className="text-xs text-neutral-500">Last 6 months</p>
        </div>
        <RentLine data={chart} />
      </div>
    </div>
  );
}
