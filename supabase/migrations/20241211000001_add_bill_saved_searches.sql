-- Create table for saved bill searches
CREATE TABLE bill_saved_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_bill_saved_searches_org_id ON bill_saved_searches(org_id);
CREATE INDEX idx_bill_saved_searches_org_is_default ON bill_saved_searches(org_id, is_default);
CREATE INDEX idx_bill_saved_searches_name ON bill_saved_searches(name);

-- Create RLS policies
ALTER TABLE bill_saved_searches ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access saved searches from their organization
CREATE POLICY "Users can view saved searches from their org" ON bill_saved_searches
  FOR SELECT USING (
    org_id IN (
      SELECT om.org_id 
      FROM org_members om 
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- Policy: Users can create saved searches in their organization
CREATE POLICY "Users can create saved searches in their org" ON bill_saved_searches
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT om.org_id 
      FROM org_members om 
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- Policy: Users can update saved searches in their organization
CREATE POLICY "Users can update saved searches in their org" ON bill_saved_searches
  FOR UPDATE USING (
    org_id IN (
      SELECT om.org_id 
      FROM org_members om 
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- Policy: Users can delete saved searches in their organization  
CREATE POLICY "Users can delete saved searches in their org" ON bill_saved_searches
  FOR DELETE USING (
    org_id IN (
      SELECT om.org_id 
      FROM org_members om 
      WHERE om.user_id = auth.uid() 
      AND om.status = 'active'
    )
  );

-- Super admin policy for full access
CREATE POLICY "Super admins have full access to saved searches" ON bill_saved_searches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'is_super_admin' = 'true'
    )
  );

-- Function to automatically set updated_at timestamp
CREATE OR REPLACE FUNCTION update_bill_saved_searches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER trigger_bill_saved_searches_updated_at
  BEFORE UPDATE ON bill_saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_bill_saved_searches_updated_at();

-- Constraint to ensure only one default search per organization
CREATE UNIQUE INDEX idx_bill_saved_searches_unique_default 
ON bill_saved_searches (org_id) 
WHERE is_default = TRUE;