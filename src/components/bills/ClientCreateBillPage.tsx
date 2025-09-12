'use client';

import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import BillForm from '@/components/BillForm';

export default function ClientCreateBillPage() {
  const router = useRouter();

  const handleCreated = () => {
    // Redirect back to bills list after creation
    router.push('/bills');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 dark:bg-green-950 rounded-lg">
              <svg
                className="h-5 w-5 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                Create New Bill
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Add a new bill to your organization
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Creation Form */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
        <div className="p-6">
          <Suspense
            fallback={
              <div className="animate-pulse h-64 bg-neutral-100 dark:bg-neutral-800 rounded"></div>
            }
          >
            <BillForm onCreated={handleCreated} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
