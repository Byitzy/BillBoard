"use client";
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDefaultOrgId } from '@/lib/org';
import { useLocale } from '@/components/i18n/LocaleProvider';

type Project = { id: string; name: string; billCount?: number; totalAmount?: number };

export default function ProjectsPage() {
  const supabase = getSupabaseClient();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  // Filter projects based on search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const searchLower = searchQuery.toLowerCase();
    return projects.filter(project => 
      project.name.toLowerCase().includes(searchLower)
    );
  }, [projects, searchQuery]);

  async function load() {
    setLoading(true);
    setError(null);
    const orgId = await getDefaultOrgId(supabase);
    if (!orgId) {
      window.location.href = '/onboarding';
      return;
    }
    const { data, error } = await supabase
      .from('projects')
      .select('id,name')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      const projectsData = data ?? [];
      
      // Get bill counts and total amounts for each project
      const projectsWithStats = await Promise.all(
        projectsData.map(async (project: any) => {
          const { data: billsData, count } = await supabase
            .from('bills')
            .select('amount_total', { count: 'exact' })
            .eq('project_id', project.id)
            .eq('org_id', orgId);
          
          const totalAmount = (billsData ?? []).reduce((sum: number, bill: any) => 
            sum + (Number(bill.amount_total) || 0), 0);
          
          return {
            ...project,
            billCount: count ?? 0,
            totalAmount
          };
        })
      );
      
      setProjects(projectsWithStats);
    }
    setLoading(false);
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const orgId = await getDefaultOrgId(supabase);
    if (!orgId) {
      setError('No organization found.');
      return;
    }
    const { error } = await supabase.from('projects').insert({ name: name.trim(), org_id: orgId });
    if (error) setError(error.message);
    setName('');
    await load();
  }

  async function removeProject(id: string) {
    if (!confirm('Delete this project?')) return;
    setLoading(true);
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) setError(error.message);
    await load();
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t('projects.title')}</h1>
        <p className="text-sm text-neutral-500">{t('projects.createAndManage')}</p>
      </div>
      <div className="space-y-3">
        <form onSubmit={createProject} className="flex gap-2">
          <input
            placeholder={t('projects.newProjectName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full max-w-sm rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
          />
          <button type="submit" className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Add
          </button>
        </form>
        
        {/* Search input */}
        <div className="max-w-sm">
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-900"
          />
        </div>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 text-sm shadow-sm dark:border-neutral-800">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              {[t('common.name'), t('common.bills'), t('common.totalDollar'), t('common.actions')].map((h) => (
                <th key={h} className="px-3 py-2 text-neutral-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-2" colSpan={4}>
                  {t('common.loading')}
                </td>
              </tr>
            ) : filteredProjects.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={4}>
                  {projects.length === 0 ? 'No projects yet.' : 'No projects match your search.'}
                </td>
              </tr>
            ) : (
              filteredProjects.map((p) => (
                <tr key={p.id} className="border-t border-neutral-100 dark:border-neutral-800">
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2">
                    <Link 
                      href={`/bills?projectId=${p.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {p.billCount ?? 0}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link 
                      href={`/bills?projectId=${p.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-mono"
                    >
                      ${(p.totalAmount ?? 0).toFixed(2)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end">
                      <button
                        className="rounded-lg border px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                        onClick={() => removeProject(p.id)}
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
