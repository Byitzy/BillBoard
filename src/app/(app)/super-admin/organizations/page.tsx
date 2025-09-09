"use client";
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Settings, Users, Building2 } from 'lucide-react';
import Link from 'next/link';

type Organization = {
  id: string;
  name: string;
  created_at: string;
  member_count?: number;
};

export default function SuperAdminOrganizationsPage() {
  const supabase = getSupabaseClient();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  async function loadOrganizations() {
    try {
      setLoading(true);
      
      // Fetch organizations with member count
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          created_at,
          org_members(count)
        `)
        .order('created_at', { ascending: false });

      if (orgsError) {
        console.error('Error fetching organizations:', orgsError);
        setError('Failed to load organizations');
        return;
      }

      // Transform the data to include member count
      const orgsWithCount = orgs?.map(org => ({
        ...org,
        member_count: org.org_members?.[0]?.count || 0
      })) || [];

      setOrganizations(orgsWithCount);
    } catch (error) {
      console.error('Error loading organizations:', error);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading organizations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organization Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage all organizations in the system</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizations.map((org) => (
          <div key={org.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{org.name}</h3>
                  <p className="text-sm text-gray-500">
                    Created {new Date(org.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4" />
                <span>{org.member_count} members</span>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href={`/super-admin/organizations/${org.id}/settings`}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Manage Organization
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {organizations.length === 0 && !loading && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No organizations found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            There are no organizations in the system yet.
          </p>
        </div>
      )}
    </div>
  );
}