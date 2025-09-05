type Props = { columns?: string[] };

export default function DataTable({ columns = ['Column A', 'Column B'] }: Props) {
  return (
    <div className="overflow-x-auto rounded border border-neutral-200 dark:border-neutral-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {columns.map((c) => (
              <td key={c} className="px-3 py-2">—</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

