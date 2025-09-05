import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/app-shell/Sidebar';
import Topbar from '@/components/app-shell/Topbar';

export const metadata: Metadata = {
  title: 'BillBoard',
  description: 'Multi-tenant bill management with calendar and approvals'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="min-h-full">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1">
            <Topbar />
            <div className="container-page">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}

