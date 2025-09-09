-- NUCLEAR OPTION: Completely reset org_members RLS policies
-- Run this in Supabase SQL Editor to completely fix the recursion

-- Step 1: Temporarily disable RLS to break the recursion cycle
ALTER TABLE org_members DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies (this will work now that RLS is disabled)
DROP POLICY IF EXISTS "super admin full access to org members" ON org_members;
DROP POLICY IF EXISTS "org members visible to same org members" ON org_members;
DROP POLICY IF EXISTS "admin can insert org members" ON org_members;
DROP POLICY IF EXISTS "admin can update org members" ON org_members;
DROP POLICY IF EXISTS "admin can delete org members" ON org_members;
DROP POLICY IF EXISTS "org members visible to org members" ON org_members;
DROP POLICY IF EXISTS "org members insert by admin" ON org_members;
DROP POLICY IF EXISTS "org members update by admin" ON org_members;
DROP POLICY IF EXISTS "org members delete by admin" ON org_members;
DROP POLICY IF EXISTS "super_admin_full_access" ON org_members;
DROP POLICY IF EXISTS "members_can_view_same_org" ON org_members;
DROP POLICY IF EXISTS "admins_can_manage_members" ON org_members;

-- Step 3: Re-enable RLS (table will have NO policies at this point)
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Step 4: Create completely new, non-recursive policies
CREATE POLICY "allow_super_admin_all" ON org_members
  FOR ALL 
  USING ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true')
  WITH CHECK ((auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true');

-- Simple policy for regular users - NO SUBQUERIES that could cause recursion
CREATE POLICY "allow_member_read_own_org" ON org_members
  FOR SELECT 
  USING (
    -- Super admin can see all
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true'
    OR
    -- Only show records where user_id matches auth.uid() (no subqueries!)
    user_id = auth.uid()
  );

-- Admin policy for modifications - also no subqueries initially
CREATE POLICY "allow_admin_modify_own_org" ON org_members
  FOR ALL
  USING (
    -- Super admin can modify all
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true'
    OR
    -- Regular admins can only modify their own record for now (safe approach)
    (user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    -- Super admin can create/modify all
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true'
    OR
    -- Regular admins can only create/modify their own record for now
    (user_id = auth.uid() AND role = 'admin')
  );

-- Verify the fix
SELECT 'Policies reset successfully. Testing basic query...' as status;
SELECT COUNT(*) as total_members FROM org_members;

COMMENT ON TABLE org_members IS 'RLS policies reset to prevent infinite recursion. Super admins have full access, regular users can only see their own records initially.';