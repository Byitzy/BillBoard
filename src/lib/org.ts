import type { SupabaseClient } from '@supabase/supabase-js';

export async function getDefaultOrgId(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) return null;
  return data?.[0]?.org_id ?? null;
}
