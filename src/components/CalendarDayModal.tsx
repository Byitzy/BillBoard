'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, ExternalLink } from 'lucide-react';
import { useLocale } from '@/components/i18n/LocaleProvider';

type Bill = {
  id: string;
  due_date: string;
  state: string;
  amount_due: number;
  bill_id: string;
  title?: string;
  vendor_name?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  bills: Bill[];
  holidayName?: string;
};

export default function CalendarDayModal({
  isOpen,
  onClose,
  date,
  bills,
  holidayName,
}: Props) {
  const router = useRouter();
  const { t } = useLocale();

  if (!isOpen) return null;

  const total = bills.reduce((sum, bill) => sum + bill.amount_due, 0);
  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getStateColor = (state: string) => {
    switch (state) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'on_hold':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'pending_approval':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'scheduled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'canceled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const handleBillClick = (bill: Bill) => {
    router.push(`/bills/${bill.bill_id}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {formattedDate}
            </h2>
            {holidayName && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                🎉 {holidayName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {bills.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {holidayName ? (
                <p>No bills due on this holiday.</p>
              ) : (
                <p>No bills due on this day.</p>
              )}
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {bills.length} {bills.length === 1 ? 'bill' : 'bills'} due
                  </span>
                  <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Bills List */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {bills.map((bill) => (
                  <div
                    key={bill.id}
                    onClick={() => handleBillClick(bill)}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {bill.title || `Bill ${bill.id.slice(0, 8)}`}
                          </h4>
                          <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {bill.vendor_name && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            {bill.vendor_name}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStateColor(bill.state)}`}
                          >
                            {bill.state.replace('_', ' ')}
                          </span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            ${bill.amount_due.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
