-- Organization invites table
create table org_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role role not null default 'viewer',
  status text not null default 'active',
  invited_by uuid not null references auth.users(id) on delete cascade,
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  
  -- Prevent duplicate invites for same email/org
  unique (org_id, email)
);

-- Indexes
create index on org_invites (org_id);
create index on org_invites (email);
create index on org_invites (token);
create index on org_invites (expires_at);

-- RLS policies
alter table org_invites enable row level security;

-- Admins can view all invites for their org
create policy "invites readable by org admins" on org_invites 
  for select using (has_role(org_id, array['admin']::role[]));

-- Admins can create invites for their org  
create policy "invites insert by org admins" on org_invites
  for insert with check (
    has_role(org_id, array['admin']::role[]) and 
    invited_by = auth.uid()
  );

-- Admins can update invites for their org (e.g., to revoke)
create policy "invites update by org admins" on org_invites
  for update using (has_role(org_id, array['admin']::role[]));

-- Admins can delete invites for their org
create policy "invites delete by org admins" on org_invites
  for delete using (has_role(org_id, array['admin']::role[]));

-- Function to accept an invite
create or replace function accept_invite(invite_token text)
returns json
language plpgsql
security definer
as $$
declare
  invite_record org_invites%rowtype;
  user_id uuid;
  result json;
begin
  -- Get current user
  user_id := auth.uid();
  if user_id is null then
    return json_build_object('error', 'Not authenticated');
  end if;

  -- Find the invite
  select * into invite_record
  from org_invites
  where token = invite_token
    and accepted_at is null
    and expires_at > now();
  
  if not found then
    return json_build_object('error', 'Invalid or expired invite');
  end if;

  -- Check if user is already a member of this org
  if exists(select 1 from org_members where org_id = invite_record.org_id and user_id = user_id) then
    return json_build_object('error', 'Already a member of this organization');
  end if;

  -- Accept the invite
  begin
    -- Mark invite as accepted
    update org_invites
    set accepted_at = now(), accepted_by = user_id
    where id = invite_record.id;

    -- Add user to org
    insert into org_members (org_id, user_id, role, status)
    values (invite_record.org_id, user_id, invite_record.role, invite_record.status);

    return json_build_object(
      'success', true,
      'org_id', invite_record.org_id,
      'role', invite_record.role
    );
  exception
    when others then
      return json_build_object('error', 'Failed to accept invite: ' || SQLERRM);
  end;
end;
$$;