import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ThemeProvider, ThemeScript } from '@/components/theme/ThemeProvider';
import type { Metadata } from 'next';
import './globals.css';

// Disable static pre-render; rely on runtime (auth-driven app)
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'BillBoard',
  description: 'Multi-tenant bill management with calendar and approvals',
  icons: {
    icon: [
      {
        url: 'https://aytzgpwkjmdgznxxtrdd.supabase.co/storage/v1/object/public/brand/BillBoard_icon.jpg',
        rel: 'icon',
        type: 'image/jpeg',
      },
    ],
    apple: [
      {
        url: 'https://aytzgpwkjmdgznxxtrdd.supabase.co/storage/v1/object/public/brand/BillBoard_icon.jpg',
        sizes: '180x180',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="min-h-full">
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen">
        <QueryProvider>
          <ThemeProvider>
            <LocaleProvider>{children}</LocaleProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
