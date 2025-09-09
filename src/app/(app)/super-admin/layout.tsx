<<<<<<< HEAD
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
=======
"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { LogOut, Settings, Users, Building2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
>>>>>>> origin/beta

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
<<<<<<< HEAD
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
=======
  const router = useRouter();
  const pathname = usePathname();
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login' as any);
        return;
      }

      const isSuperAdmin = session.user.user_metadata?.is_super_admin === true || 
                          session.user.user_metadata?.is_super_admin === 'true';
      
      if (!isSuperAdmin) {
        router.push('/dashboard' as any);
        return;
      }

      setAuthenticated(true);
      setLoading(false);
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login' as any);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };
>>>>>>> origin/beta

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
<<<<<<< HEAD
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
=======
        <div className="text-lg">Loading...</div>
>>>>>>> origin/beta
      </div>
    );
  }

<<<<<<< HEAD
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Crown className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Access Denied
          </h1>
          <p className="text-neutral-600">Super admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Super Admin Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 z-50">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                BillBoard Admin
              </div>
              <div className="text-xs text-neutral-500">
                Super Administrator
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
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
=======
  if (!authenticated) {
    return null;
  }

  const navigation = [
    { name: 'Dashboard', href: '/super-admin', icon: Building2, current: pathname === '/super-admin' },
    { name: 'Users', href: '/super-admin/users', icon: Users, current: pathname === '/super-admin/users' },
    { name: 'Organizations', href: '/super-admin/organizations', icon: Settings, current: pathname.startsWith('/super-admin/organizations') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-900 shadow-lg">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
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
>>>>>>> origin/beta
                </Link>
              );
            })}
          </nav>

<<<<<<< HEAD
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
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        <div className="p-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
=======
          <div className="absolute bottom-6 left-4 right-4">
            <button
              onClick={handleSignOut as any}
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
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
>>>>>>> origin/beta
