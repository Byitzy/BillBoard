import type { Metadata } from 'next';
import '../globals.css';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import { ThemeProvider, ThemeScript } from '@/components/theme/ThemeProvider';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'BillBoard - Sign In',
  description: 'Sign in to BillBoard',
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

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="min-h-full">
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-[hsl(var(--surface))]">
        <ThemeProvider>
          <LocaleProvider>
            <div className="min-h-screen flex items-center justify-center p-4">
              <div className="w-full max-w-md">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-[hsl(var(--text))]">
                    BillBoard
                  </h1>
                  <p className="text-sm text-[hsl(var(--text-muted))] mt-2">
                    Multi-tenant bill management
                  </p>
                </div>
                {children}
              </div>
            </div>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
