type Props = {
  date: Date;
  renderDay?: (d: Date) => React.ReactNode;
  getDayClass?: (d: Date) => string;
};

export default function CalendarMonth({ date, renderDay, getDayClass }: Props) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const days: Date[] = [];
  for (let d = 1; d <= end.getDate(); d++) days.push(new Date(year, month, d));

  return (
    <div className="grid grid-cols-7 gap-2 text-sm">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
        <div key={d} className="font-medium text-neutral-500">
          {d}
        </div>
      ))}
      {Array(start.getDay())
        .fill(null)
        .map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
      {days.map((d) => (
        <div
          key={d.toISOString()}
          className={cn(
            'min-h-24 border border-neutral-200 dark:border-neutral-800 rounded p-2',
            getDayClass ? getDayClass(d) : ''
          )}
        >
          <div className="text-xs text-neutral-500">{d.getDate()}</div>
          {renderDay ? renderDay(d) : null}
        </div>
      ))}
    </div>
  );
}
import { cn } from '@/lib/utils';
