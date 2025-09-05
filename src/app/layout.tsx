import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/app-shell/Sidebar';
import Topbar from '@/components/app-shell/Topbar';
import { ThemeProvider, ThemeScript } from '@/components/theme/ThemeProvider';

export const metadata: Metadata = {
  title: 'BillBoard',
  description: 'Multi-tenant bill management with calendar and approvals'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="min-h-full">
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen">
        <ThemeProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1">
              <Topbar />
              <div className="container-page">{children}</div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
