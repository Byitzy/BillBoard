-- Fix RLS recursion issue by allowing super admins to bypass org_members policies
-- and creating non-recursive policies for org_members table

-- First, drop the problematic policies
DROP POLICY IF EXISTS "org members visible to org members" ON org_members;
DROP POLICY IF EXISTS "org members insert by admin" ON org_members;
DROP POLICY IF EXISTS "org members update by admin" ON org_members;
DROP POLICY IF EXISTS "org members delete by admin" ON org_members;

-- Create new policies that don't cause recursion
-- Super admins can see all org members
CREATE POLICY "super admin full access to org members" ON org_members
  FOR ALL USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true'
  );

-- Regular users can see org members where they are also members
-- Use direct query instead of has_role function to avoid recursion
CREATE POLICY "org members visible to same org members" ON org_members
  FOR SELECT USING (
    -- Super admin bypass
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true' OR
    -- Regular member access: can see members of orgs where user is also a member
    EXISTS (
      SELECT 1 FROM org_members om2 
      WHERE om2.org_id = org_members.org_id 
      AND om2.user_id = auth.uid() 
      AND om2.status = 'active'
    )
  );

-- Only admins can insert new org members
CREATE POLICY "admin can insert org members" ON org_members
  FOR INSERT WITH CHECK (
    -- Super admin bypass
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true' OR
    -- Regular admin access
    EXISTS (
      SELECT 1 FROM org_members om 
      WHERE om.org_id = org_members.org_id 
      AND om.user_id = auth.uid() 
      AND om.role = 'admin' 
      AND om.status = 'active'
    )
  );

-- Only admins can update org members
CREATE POLICY "admin can update org members" ON org_members
  FOR UPDATE USING (
    -- Super admin bypass
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true' OR
    -- Regular admin access
    EXISTS (
      SELECT 1 FROM org_members om 
      WHERE om.org_id = org_members.org_id 
      AND om.user_id = auth.uid() 
      AND om.role = 'admin' 
      AND om.status = 'active'
    )
  );

-- Only admins can delete org members
CREATE POLICY "admin can delete org members" ON org_members
  FOR DELETE USING (
    -- Super admin bypass
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_super_admin' = 'true' OR
    -- Regular admin access
    EXISTS (
      SELECT 1 FROM org_members om 
      WHERE om.org_id = org_members.org_id 
      AND om.user_id = auth.uid() 
      AND om.role = 'admin' 
      AND om.status = 'active'
    )
  );

COMMENT ON POLICY "super admin full access to org members" ON org_members IS 'Super admins bypass all org_members restrictions';
COMMENT ON POLICY "org members visible to same org members" ON org_members IS 'Members can see other members of their organizations';
COMMENT ON POLICY "admin can insert org members" ON org_members IS 'Only admins and super admins can add new members';
COMMENT ON POLICY "admin can update org members" ON org_members IS 'Only admins and super admins can update members';
COMMENT ON POLICY "admin can delete org members" ON org_members IS 'Only admins and super admins can remove members';