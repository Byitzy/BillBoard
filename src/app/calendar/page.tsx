import CalendarMonth from '@/components/CalendarMonth';

export default function CalendarPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Calendar</h1>
      <CalendarMonth date={new Date()} />
    </div>
  );
}
