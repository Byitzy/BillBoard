-- Create table for file attachments
CREATE TABLE attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  linked_type VARCHAR(50) NOT NULL, -- 'bill', 'occurrence', 'vendor', 'project'
  linked_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  mime VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_attachments_org_id ON attachments(org_id);
CREATE INDEX idx_attachments_linked ON attachments(linked_type, linked_id);
CREATE INDEX idx_attachments_created_at ON attachments(created_at);

-- Create RLS policies
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access attachments from their organization
CREATE POLICY "Users can view attachments from their org" ON attachments
  FOR SELECT USING (
    org_id IN (
      SELECT om.org_id 
      FROM org_members om 
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- Policy: Users can create attachments in their organization
CREATE POLICY "Users can create attachments in their org" ON attachments
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT om.org_id 
      FROM org_members om 
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- Policy: Users can update attachments in their organization
CREATE POLICY "Users can update attachments in their org" ON attachments
  FOR UPDATE USING (
    org_id IN (
      SELECT om.org_id 
      FROM org_members om 
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- Policy: Users can delete attachments in their organization
CREATE POLICY "Users can delete attachments in their org" ON attachments
  FOR DELETE USING (
    org_id IN (
      SELECT om.org_id 
      FROM org_members om 
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- Super admin policy for full access
CREATE POLICY "Super admins have full access to attachments" ON attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'is_super_admin' = 'true'
    )
  );

-- Create storage bucket for attachments (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('billboard', 'billboard', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage bucket
CREATE POLICY "Users can view files from their org" ON storage.objects
FOR SELECT USING (
  bucket_id = 'billboard' AND
  (storage.foldername(name))[1] = CONCAT('org_', (
    SELECT om.org_id::TEXT
    FROM org_members om 
    WHERE om.user_id = auth.uid() 
    AND om.status = 'active'
    LIMIT 1
  ))
);

CREATE POLICY "Users can upload files to their org" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'billboard' AND
  (storage.foldername(name))[1] = CONCAT('org_', (
    SELECT om.org_id::TEXT
    FROM org_members om 
    WHERE om.user_id = auth.uid() 
    AND om.status = 'active'
    LIMIT 1
  ))
);

CREATE POLICY "Users can update files from their org" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'billboard' AND
  (storage.foldername(name))[1] = CONCAT('org_', (
    SELECT om.org_id::TEXT
    FROM org_members om 
    WHERE om.user_id = auth.uid() 
    AND om.status = 'active'
    LIMIT 1
  ))
);

CREATE POLICY "Users can delete files from their org" ON storage.objects
FOR DELETE USING (
  bucket_id = 'billboard' AND
  (storage.foldername(name))[1] = CONCAT('org_', (
    SELECT om.org_id::TEXT
    FROM org_members om 
    WHERE om.user_id = auth.uid() 
    AND om.status = 'active'
    LIMIT 1
  ))
);

-- Super admin storage policies
CREATE POLICY "Super admins have full access to storage" ON storage.objects
FOR ALL USING (
  bucket_id = 'billboard' AND
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'is_super_admin' = 'true'
  )
);