export default function OccurrenceCard() {
  return (
    <div className="rounded border border-neutral-200 dark:border-neutral-800 p-3 text-sm">
      <div className="font-medium">Vendor • Project</div>
      <div className="text-neutral-500">$0.00 • Due YYYY-MM-DD</div>
      <div className="text-amber-600 dark:text-amber-400">Submit by YYYY-MM-DD</div>
    </div>
  );
}

