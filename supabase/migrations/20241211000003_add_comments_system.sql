-- Create table for comments and notes on bills
CREATE TABLE bill_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  comment_type VARCHAR(50) NOT NULL DEFAULT 'comment', -- 'comment', 'status_change', 'approval', 'rejection', 'note'
  metadata JSONB DEFAULT '{}', -- Store additional data like old_status, new_status, etc.
  is_internal BOOLEAN DEFAULT FALSE, -- Internal notes vs external comments
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_bill_comments_org_id ON bill_comments(org_id);
CREATE INDEX idx_bill_comments_bill_id ON bill_comments(bill_id);
CREATE INDEX idx_bill_comments_user_id ON bill_comments(user_id);
CREATE INDEX idx_bill_comments_type ON bill_comments(comment_type);
CREATE INDEX idx_bill_comments_created_at ON bill_comments(created_at);
CREATE INDEX idx_bill_comments_internal ON bill_comments(is_internal);

-- Create RLS policies
ALTER TABLE bill_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view comments from their organization
CREATE POLICY "Users can view comments from their org" ON bill_comments
  FOR SELECT USING (
    org_id IN (
      SELECT om.org_id 
      FROM org_members om 
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- Policy: Users can create comments in their organization
CREATE POLICY "Users can create comments in their org" ON bill_comments
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT om.org_id 
      FROM org_members om 
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    ) AND user_id = auth.uid()
  );

-- Policy: Users can update their own comments (within time limit or if admin)
CREATE POLICY "Users can update their own comments" ON bill_comments
  FOR UPDATE USING (
    org_id IN (
      SELECT om.org_id 
      FROM org_members om 
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    ) AND (
      (user_id = auth.uid() AND created_at > NOW() - INTERVAL '15 minutes') OR
      EXISTS (
        SELECT 1 FROM org_members om 
        WHERE om.user_id = auth.uid() 
        AND om.org_id = bill_comments.org_id
        AND om.role IN ('admin', 'approver')
        AND om.status = 'active'
      )
    )
  );

-- Policy: Only admins and original authors can delete comments
CREATE POLICY "Admins and authors can delete comments" ON bill_comments
  FOR DELETE USING (
    org_id IN (
      SELECT om.org_id 
      FROM org_members om 
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    ) AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM org_members om 
        WHERE om.user_id = auth.uid() 
        AND om.org_id = bill_comments.org_id
        AND om.role IN ('admin')
        AND om.status = 'active'
      )
    )
  );

-- Super admin policy for full access
CREATE POLICY "Super admins have full access to comments" ON bill_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'is_super_admin' = 'true'
    )
  );

-- Function to automatically set updated_at timestamp
CREATE OR REPLACE FUNCTION update_bill_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- If content changed, set edited_at and edited_by
  IF OLD.content != NEW.content THEN
    NEW.edited_at = NOW();
    NEW.edited_by = auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER trigger_bill_comments_updated_at
  BEFORE UPDATE ON bill_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_comments_updated_at();

-- Function to automatically create status change comments
CREATE OR REPLACE FUNCTION create_status_change_comment()
RETURNS TRIGGER AS $$
DECLARE
  org_id_val UUID;
  old_status TEXT;
  new_status TEXT;
BEGIN
  -- Only create comment if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get the org_id for this bill
    SELECT b.org_id INTO org_id_val 
    FROM bills b 
    WHERE b.id = NEW.id;
    
    old_status := COALESCE(OLD.status, 'none');
    new_status := COALESCE(NEW.status, 'none');
    
    -- Insert automatic status change comment
    INSERT INTO bill_comments (
      org_id,
      bill_id,
      user_id,
      content,
      comment_type,
      metadata,
      is_internal
    ) VALUES (
      org_id_val,
      NEW.id,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
      CASE 
        WHEN new_status = 'pending_approval' THEN 'Bill submitted for approval'
        WHEN new_status = 'approved' THEN 'Bill approved'
        WHEN new_status = 'paid' THEN 'Bill marked as paid'
        WHEN new_status = 'on_hold' THEN 'Bill put on hold'
        WHEN new_status = 'canceled' THEN 'Bill canceled'
        ELSE 'Status changed from ' || old_status || ' to ' || new_status
      END,
      'status_change',
      jsonb_build_object(
        'old_status', old_status,
        'new_status', new_status
      ),
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create status change comments
CREATE TRIGGER trigger_bill_status_change_comment
  AFTER UPDATE ON bills
  FOR EACH ROW
  EXECUTE FUNCTION create_status_change_comment();

-- Create a view for comments with user information
CREATE VIEW bill_comments_with_users AS
SELECT 
  bc.*,
  u.raw_user_meta_data->>'full_name' as user_name,
  u.email as user_email,
  om.role as user_role
FROM bill_comments bc
LEFT JOIN auth.users u ON bc.user_id = u.id
LEFT JOIN org_members om ON om.user_id = bc.user_id AND om.org_id = bc.org_id
WHERE om.status = 'active' OR bc.user_id = '00000000-0000-0000-0000-000000000000';

-- RLS policy for the view
ALTER VIEW bill_comments_with_users SET (security_invoker = on);

-- Grant permissions
GRANT SELECT ON bill_comments_with_users TO authenticated;