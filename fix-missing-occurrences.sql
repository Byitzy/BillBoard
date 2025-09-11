-- Fix missing bill occurrences for non-recurring bills
-- This creates occurrences for bills that don't have them

INSERT INTO bill_occurrences (
  org_id,
  bill_id, 
  project_id,
  vendor_id,
  sequence,
  amount_due,
  due_date,
  state
)
SELECT 
  b.org_id,
  b.id as bill_id,
  b.project_id,
  b.vendor_id,
  1 as sequence,
  b.amount_total as amount_due,
  COALESCE(b.due_date, CURRENT_DATE) as due_date,
  CASE 
    WHEN b.status = 'active' THEN 'pending_approval'::occ_state
    WHEN b.status = 'pending_approval' THEN 'pending_approval'::occ_state  
    WHEN b.status = 'approved' THEN 'approved'::occ_state
    WHEN b.status = 'on_hold' THEN 'on_hold'::occ_state
    ELSE 'pending_approval'::occ_state
  END as state
FROM bills b
WHERE b.recurring_rule IS NULL  -- Only non-recurring bills
  AND NOT EXISTS (
    -- Only if no occurrence exists
    SELECT 1 FROM bill_occurrences bo 
    WHERE bo.bill_id = b.id
  );

-- Verify the fix
SELECT 
  'Bills without occurrences' as check_name,
  COUNT(*) as count
FROM bills b
WHERE b.recurring_rule IS NULL 
  AND NOT EXISTS (
    SELECT 1 FROM bill_occurrences bo 
    WHERE bo.bill_id = b.id
  );