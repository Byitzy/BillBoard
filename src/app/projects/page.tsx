'use client';
import { useEffect, useState } from 'react';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { getDefaultOrgId } from '@/lib/org';
import { getSupabaseClient } from '@/lib/supabase/client';

type Project = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
};

export default function ProjectsPage() {
  const supabase = getSupabaseClient();
  const { t } = useLocale();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    name: '',
    code: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      .select('id,name,code,description')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setProjects(data ?? []);
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
    const { error } = await supabase
      .from('projects')
      .insert({ name: name.trim(), org_id: orgId });
    if (error) setError(error.message);
    setName('');
    await load();
  }

  async function startEdit(project: Project) {
    setEditing(project.id);
    setEditData({
      name: project.name,
      code: project.code || '',
      description: project.description || '',
    });
  }

  async function saveEdit(id: string) {
    if (!editData.name.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from('projects')
      .update({
        name: editData.name.trim(),
        code: editData.code.trim() || null,
        description: editData.description.trim() || null,
      })
      .eq('id', id);
    if (error) setError(error.message);
    setEditing(null);
    setEditData({ name: '', code: '', description: '' });
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
        <p className="text-sm text-neutral-500">
          {t('projects.createAndManage')}
        </p>
      </div>
      <form onSubmit={createProject} className="flex gap-2">
        <input
          placeholder={t('projects.newProjectName')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-neutral-200  px-3 py-2 text-sm dark:border-neutral-800"
        />
        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add
        </button>
      </form>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 text-sm shadow-sm dark:border-neutral-800">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              {['Name', 'Code', 'Description', 'Actions'].map((h) => (
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
                  Loading...
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-neutral-500" colSpan={4}>
                  No projects yet.
                </td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-neutral-100 dark:border-neutral-800"
                >
                  <td className="px-3 py-2">
                    {editing === p.id ? (
                      <input
                        className="w-full rounded border border-neutral-200 px-2 py-1 text-sm dark:border-neutral-800"
                        value={editData.name}
                        onChange={(e) =>
                          setEditData({ ...editData, name: e.target.value })
                        }
                      />
                    ) : (
                      p.name
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editing === p.id ? (
                      <input
                        className="w-full rounded border border-neutral-200 px-2 py-1 text-sm dark:border-neutral-800"
                        value={editData.code}
                        onChange={(e) =>
                          setEditData({ ...editData, code: e.target.value })
                        }
                        placeholder="Optional"
                      />
                    ) : (
                      p.code || '-'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editing === p.id ? (
                      <input
                        className="w-full rounded border border-neutral-200 px-2 py-1 text-sm dark:border-neutral-800"
                        value={editData.description}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Optional"
                      />
                    ) : (
                      p.description || '-'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      {editing === p.id ? (
                        <>
                          <button
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
                            onClick={() => saveEdit(p.id)}
                          >
                            Save
                          </button>
                          <button
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
                            onClick={() => {
                              setEditing(null);
                              setEditData({
                                name: '',
                                code: '',
                                description: '',
                              });
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="rounded-lg border px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
                            onClick={() => startEdit(p)}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-lg border px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                            onClick={() => removeProject(p.id)}
                          >
                            Delete
                          </button>
                        </>
                      )}
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
