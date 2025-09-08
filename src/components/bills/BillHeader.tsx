'use client';

interface Bill {
  id: string;
  title: string;
  amount_total: number;
  currency?: string;
  due_date: string | null;
  recurring_rule?: any | null;
}

interface BillHeaderProps {
  bill: Bill | null;
  error: string | null;
}

export default function BillHeader({ bill, error }: BillHeaderProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{bill ? bill.title : 'Bill'}</h1>
        {bill && (
          <p className="text-sm text-neutral-500">
            Total {bill.currency ?? 'CAD'} ${bill.amount_total.toFixed(2)}
            {bill.due_date ? ` · Due ${bill.due_date}` : ''}
          </p>
        )}
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
