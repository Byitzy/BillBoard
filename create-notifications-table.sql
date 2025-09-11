-- Create notifications table for the notification center
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  title text NOT NULL,
  body text NOT NULL,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX ON notifications (org_id, user_id, created_at DESC);
CREATE INDEX ON notifications (read_at) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "notifications read by user" ON notifications 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications insert by org members" ON notifications 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members 
      WHERE org_id = notifications.org_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "notifications update by user" ON notifications 
  FOR UPDATE USING (user_id = auth.uid());