-- Fix super admin access by updating RLS helper functions to include super admin bypass
-- This fixes the issue where super admins can't see organizations and other data
-- Handles both boolean and string values for is_super_admin

-- Update uid_in_org function to include super admin check
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

-- Update has_role function to include super admin check (array version)
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

-- Add uid_has_role function to include super admin check (single role version)
CREATE OR REPLACE FUNCTION uid_has_role(target_org uuid, required_role text)
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
      AND role = required_role
    );
$$;

-- Add super admin check to get_user_org function
CREATE OR REPLACE FUNCTION get_user_org()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public, auth
AS $$
  SELECT 
    CASE 
      WHEN (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true' OR
           ((auth.jwt() ->> 'user_metadata')::jsonb -> 'is_super_admin')::text = 'true'
      THEN NULL -- Super admins return NULL to bypass org-specific filtering
      ELSE (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid() 
        LIMIT 1
      )
    END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION uid_in_org(uuid) IS 'Check if user is in org or is super admin (handles both boolean and string is_super_admin values)';
COMMENT ON FUNCTION has_role(uuid, role[]) IS 'Check if user has role in org or is super admin (handles both boolean and string is_super_admin values)';
COMMENT ON FUNCTION uid_has_role(uuid, text) IS 'Check if user has specific role in org or is super admin (handles both boolean and string is_super_admin values)';
COMMENT ON FUNCTION get_user_org() IS 'Get user org ID or NULL for super admins (bypasses org filtering)';
