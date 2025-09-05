-- Enums
create type role as enum ('admin','approver','accountant','data_entry','analyst','viewer');
create type occ_state as enum ('scheduled','pending_approval','approved','on_hold','paid','failed','canceled');

-- Orgs & Members
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  branding_prefix text,
  theme jsonb,
  logo_url text,
  created_at timestamptz default now()
);

create table org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role role not null default 'viewer',
  created_at timestamptz default now(),
  unique (org_id, user_id)
);

-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  code text,
  description text,
  status text default 'active',
  created_at timestamptz default now()
);
create index on projects (org_id);

-- Vendors
create table vendors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  account_number text,
  contact text,
  email text,
  phone text,
  notes text,
  tags text[],
  created_at timestamptz default now()
);
create index on vendors (org_id);

-- Bills (master)
create table bills (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  vendor_id uuid references vendors(id) on delete set null,
  title text not null,
  description text,
  currency text not null default 'CAD',
  amount_total numeric(14,2) not null,
  category text,
  due_date date, -- nullable when recurring
  recurring_rule jsonb, -- null for one-off
  installments_total int, -- null if none
  status text not null default 'active',
  created_at timestamptz default now()
);
create index on bills (org_id);
create index on bills (project_id);
create index on bills (vendor_id);

-- Occurrences
create table bill_occurrences (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  bill_id uuid not null references bills(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  vendor_id uuid references vendors(id) on delete set null,
  sequence int not null,
  amount_due numeric(14,2) not null,
  due_date date not null,
  suggested_submission_date date,
  state occ_state not null default 'scheduled',
  moved_from_date date,
  notes text,
  created_at timestamptz default now(),
  unique (bill_id, sequence)
);
create index on bill_occurrences (org_id, due_date);
create index on bill_occurrences (state);

-- Approvals
create table approvals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  bill_occurrence_id uuid not null references bill_occurrences(id) on delete cascade,
  approver_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('approved','hold')),
  comment text,
  decided_at timestamptz not null default now()
);

-- Payments (optional reconciliation)
create table payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  bill_occurrence_id uuid not null references bill_occurrences(id) on delete cascade,
  method text,
  reference text,
  paid_at timestamptz,
  amount_paid numeric(14,2) not null,
  created_at timestamptz default now()
);

-- Updates & Feedback
create table updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body_md text not null,
  tags text[],
  published_at timestamptz default now()
);

create table feedback (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete set null,
  author_id uuid references auth.users(id) on delete set null,
  type text not null check (type in ('bug','feature','idea')),
  title text not null,
  body text,
  status text not null default 'open',
  created_at timestamptz default now()
);

-- RLS Helpers
create or replace function auth.uid_in_org(target_org uuid)
returns boolean language sql stable as $$
  select exists(select 1 from org_members where org_id = target_org and user_id = auth.uid());
$$;

create or replace function auth.has_role(target_org uuid, roles text[])
returns boolean language sql stable as $$
  select exists(select 1 from org_members where org_id = target_org and user_id = auth.uid() and role = any(roles));
$$;

-- Enable RLS and policies (examples)
alter table organizations enable row level security;
create policy "orgs readable to members" on organizations for select using (auth.uid_in_org(id));
create policy "orgs writable to admins" on organizations for update using (auth.has_role(id, array['admin'])) with check (true);

alter table org_members enable row level security;
create policy "members readable to org" on org_members for select using (auth.uid_in_org(org_id));
-- Split action-specific policies (Postgres does not allow comma-chained actions in one CREATE POLICY)
create policy "org_members admin insert"
  on org_members for insert
  with check (auth.has_role(org_id, array['admin']));

create policy "org_members admin update"
  on org_members for update
  using (auth.has_role(org_id, array['admin']))
  with check (auth.has_role(org_id, array['admin']));

create policy "org_members admin delete"
  on org_members for delete
  using (auth.has_role(org_id, array['admin']));

-- Enable RLS and basic policies for key tables used by the app

alter table vendors enable row level security;
create policy "vendors read by org members" on vendors for select using (auth.uid_in_org(org_id));
create policy "vendors write by data_entry or admin" on vendors
  for insert with check (auth.has_role(org_id, array['admin','data_entry']));
create policy "vendors update by data_entry or admin" on vendors
  for update using (auth.has_role(org_id, array['admin','data_entry']))
  with check (auth.has_role(org_id, array['admin','data_entry']));

alter table bills enable row level security;
create policy "bills read by org members" on bills for select using (auth.uid_in_org(org_id));
create policy "bills insert by data_entry or admin" on bills
  for insert with check (auth.has_role(org_id, array['admin','data_entry']));
create policy "bills update by data_entry or accountant or admin" on bills
  for update using (auth.has_role(org_id, array['admin','data_entry','accountant']))
  with check (auth.has_role(org_id, array['admin','data_entry','accountant']));

alter table bill_occurrences enable row level security;
create policy "occurrences read by org members" on bill_occurrences for select using (auth.uid_in_org(org_id));
create policy "occurrences update by accountant or admin" on bill_occurrences
  for update using (auth.has_role(org_id, array['admin','accountant']))
  with check (auth.has_role(org_id, array['admin','accountant']));
