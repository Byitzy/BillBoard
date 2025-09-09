'use client';
import { LogOut, Settings, Users, Building2, Crown } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const isSuperAdmin =
        session.user.user_metadata?.is_super_admin === true ||
        session.user.user_metadata?.is_super_admin === 'true';

      if (!isSuperAdmin) {
        router.push('/dashboard');
        return;
      }

      setAuthenticated(true);
      setLoading(false);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/super-admin',
      icon: Building2,
      current: pathname === '/super-admin',
    },
    {
      name: 'Users',
      href: '/super-admin/users',
      icon: Users,
      current: pathname === '/super-admin/users',
    },
    {
      name: 'Organizations',
      href: '/super-admin/organizations',
      icon: Settings,
      current: pathname.startsWith('/super-admin/organizations'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-900 shadow-lg">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <Crown className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Super Admin
              </h1>
            </div>
          </div>

          <nav className="px-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href as any}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    item.current
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-6 left-4 right-4">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto p-8">
            <div className="max-w-7xl mx-auto">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
