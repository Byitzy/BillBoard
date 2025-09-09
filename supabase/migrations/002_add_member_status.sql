-- Add status column to org_members table
ALTER TABLE org_members ADD COLUMN status text NOT NULL DEFAULT 'active';

-- Create index for status filtering
CREATE INDEX idx_org_members_status ON org_members(status);

-- Update existing RLS policies to handle status
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "org members visible to org members" ON org_members;
DROP POLICY IF EXISTS "org members insert by admin" ON org_members;
DROP POLICY IF EXISTS "org members update by admin" ON org_members;
DROP POLICY IF EXISTS "org members delete by admin" ON org_members;

-- Recreate policies with status awareness
CREATE POLICY "org members visible to org members" ON org_members
  FOR SELECT USING (
    has_role(org_id, array['admin','approver','accountant','data_entry','analyst','viewer']::role[])
  );

CREATE POLICY "org members insert by admin" ON org_members
  FOR INSERT WITH CHECK (
    has_role(org_id, array['admin']::role[])
  );

CREATE POLICY "org members update by admin" ON org_members
  FOR UPDATE USING (
    has_role(org_id, array['admin']::role[])
  );

CREATE POLICY "org members delete by admin" ON org_members
  FOR DELETE USING (
    has_role(org_id, array['admin']::role[])
  );

-- Update approvals policies to only consider active members
DROP POLICY IF EXISTS "approvals visible to org members" ON approvals;
DROP POLICY IF EXISTS "approvals insert by approvers" ON approvals;

CREATE POLICY "approvals visible to org members" ON approvals
  FOR SELECT USING (
    has_role(org_id, array['admin','approver','accountant','data_entry','analyst','viewer']::role[])
  );

CREATE POLICY "approvals insert by approvers" ON approvals
  FOR INSERT WITH CHECK (
    has_role(org_id, array['admin','approver']::role[]) AND
    EXISTS (
      SELECT 1 FROM org_members 
      WHERE org_id = approvals.org_id 
      AND user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- Comments
COMMENT ON COLUMN org_members.status IS 'Member status: active, inactive, suspended';