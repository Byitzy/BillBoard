import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'BillBoard - Sign In',
  description: 'Sign in to BillBoard',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[hsl(var(--surface))]">
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
  );
}
