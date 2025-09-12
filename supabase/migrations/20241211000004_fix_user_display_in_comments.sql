-- Fix user display in comments by improving the view to better handle user names

-- Drop the existing view
DROP VIEW IF EXISTS bill_comments_with_users;

-- Recreate the view with better user name handling
CREATE VIEW bill_comments_with_users AS
SELECT 
  bc.*,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name', 
    TRIM(CONCAT(
      COALESCE(u.raw_user_meta_data->>'given_name', ''),
      ' ',
      COALESCE(u.raw_user_meta_data->>'family_name', '')
    )),
    SPLIT_PART(u.email, '@', 1)
  ) as user_name,
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