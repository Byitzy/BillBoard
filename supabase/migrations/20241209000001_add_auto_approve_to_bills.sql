-- Add auto_approve column to bills table
-- This determines if recurring bills should automatically be approved when they come due
-- or if they should go to pending_approval state

ALTER TABLE bills 
ADD COLUMN auto_approve boolean DEFAULT false;

-- Add index for performance when querying auto_approve bills
CREATE INDEX idx_bills_auto_approve ON bills (auto_approve) WHERE auto_approve = true;

-- Add comment explaining the column
COMMENT ON COLUMN bills.auto_approve IS 'If true, recurring bill occurrences will automatically be approved when due instead of requiring manual approval';