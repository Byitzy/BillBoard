import Sidebar from '@/components/app-shell/Sidebar';
import Topbar from '@/components/app-shell/Topbar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import MarkerWidget from '@/components/integrations/MarkerWidget';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <ErrorBoundary>
        <Sidebar />
      </ErrorBoundary>
      <main className="flex-1">
        <MarkerWidget />
        <ErrorBoundary>
          <Topbar />
        </ErrorBoundary>
        <div className="container-page">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
