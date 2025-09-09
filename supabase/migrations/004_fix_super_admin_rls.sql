-- Fix super admin access by updating RLS helper functions to include super admin bypass
-- This fixes the issue where super admins can't see organizations and other data

-- Use CREATE OR REPLACE instead of DROP to avoid dependency issues
CREATE OR REPLACE FUNCTION uid_in_org(target_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, auth
AS $$
  -- Super admin bypass: check both boolean and string formats
  SELECT 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true' OR
    ((auth.jwt() ->> 'user_metadata')::jsonb -> 'is_super_admin')::text = 'true' OR
    EXISTS(
      SELECT 1 FROM public.org_members 
      WHERE org_id = target_org 
      AND user_id = auth.uid()
    );
$$;

-- Use CREATE OR REPLACE instead of DROP to avoid dependency issues
CREATE OR REPLACE FUNCTION has_role(target_org uuid, roles role[])
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, auth
AS $$
  -- Super admin bypass: check both boolean and string formats
  SELECT 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true' OR
    ((auth.jwt() ->> 'user_metadata')::jsonb -> 'is_super_admin')::text = 'true' OR
    EXISTS(
      SELECT 1 FROM public.org_members 
      WHERE org_id = target_org 
      AND user_id = auth.uid() 
      AND role = ANY(roles)
    );
$$;

COMMENT ON FUNCTION uid_in_org(uuid) IS 'Check if user is in org or is super admin (handles both boolean and string is_super_admin values)';
COMMENT ON FUNCTION has_role(uuid, role[]) IS 'Check if user has role in org or is super admin (handles both boolean and string is_super_admin values)';