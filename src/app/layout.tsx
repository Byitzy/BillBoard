import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'BillBoard',
  description: 'Multi-tenant bill management with calendar and approvals'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="min-h-full">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <aside className="w-64 border-r border-neutral-200 dark:border-neutral-800 p-4 hidden md:block">
            <div className="mb-6 font-semibold">Voxture BillBoard</div>
            <nav className="space-y-2 text-sm">
              <Link href="/dashboard">Dashboard</Link>
              <div className="flex flex-col">
                <Link href="/calendar">Calendar</Link>
                <Link href="/bills">Bills</Link>
                <Link href="/vendors">Vendors</Link>
                <Link href="/projects">Projects</Link>
                <Link href="/updates">Updates</Link>
                <Link href="/settings/profile">Settings • Profile</Link>
                <Link href="/settings/organization">Settings • Organization</Link>
                <Link href="/admin/users">Admin • Users</Link>
              </div>
            </nav>
          </aside>
          <main className="flex-1">
            <header className="border-b border-neutral-200 dark:border-neutral-800">
              <div className="container-page flex items-center justify-between">
                <div className="text-base font-medium">BillBoard</div>
                <div className="text-sm text-neutral-500">Org switcher • Search • User</div>
              </div>
            </header>
            <div className="container-page">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

