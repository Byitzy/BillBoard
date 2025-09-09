'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  LogOut,
  Crown,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const superAdminNav = [
  { href: '/super-admin' as const, label: 'Dashboard', icon: LayoutDashboard },
  { href: '/super-admin/users' as const, label: 'Manage Users', icon: Users },
  {
    href: '/settings/profile' as const,
    label: 'Profile Settings',
    icon: Settings,
  },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function checkSuperAdminAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace('/login');
          return;
        }

        const userIsSuperAdmin =
          session.user.user_metadata?.is_super_admin === true ||
          session.user.user_metadata?.is_super_admin === 'true';

        if (!userIsSuperAdmin) {
          router.replace('/dashboard');
          return;
        }

        setIsSuperAdmin(true);
      } catch (error) {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }

    checkSuperAdminAuth();
  }, [router, supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Crown className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Access Denied
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Super admin privileges required.
          </p>
          <Link
            href="/dashboard"
            className="text-blue-600 hover:underline mt-4 inline-block"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-purple-900 dark:via-blue-900 dark:to-indigo-900">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border-r border-purple-200/50 dark:border-purple-800/50 shadow-xl">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Super Admin
                </h1>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  System Management
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="px-4 pb-4 space-y-1">
            {superAdminNav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    active
                      ? 'bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 text-purple-700 dark:text-purple-300'
                      : 'text-neutral-600 dark:text-neutral-300 hover:bg-purple-50 dark:hover:bg-purple-900/10 hover:text-purple-600 dark:hover:text-purple-400'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="absolute bottom-6 left-6 right-6">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 w-full transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto">
            <div className="p-8">
              <ErrorBoundary>{children}</ErrorBoundary>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}