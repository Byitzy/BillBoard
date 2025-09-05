type Props = {
  vendor?: string | null;
  project?: string | null;
  amount: number;
  due: string;
  suggested?: string | null;
  state?: string;
};

export default function OccurrenceCard({ vendor, project, amount, due, suggested, state }: Props) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-3 text-sm shadow-sm dark:border-neutral-800 card-surface">
      <div className="flex items-center justify-between">
        <div className="font-medium">
          {vendor ?? '—'}
          {project ? ` • ${project}` : ''}
        </div>
        {state && <span className="text-xs text-neutral-500">{state}</span>}
      </div>
      <div className="text-neutral-500">${amount.toFixed(2)} • Due {due}</div>
      {suggested && <div className="text-amber-600 dark:text-amber-400">Submit by {suggested}</div>}
    </div>
  );
}

