-- Extensions
create extension if not exists "pgcrypto";

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
create or replace function uid_in_org(target_org uuid)
returns boolean
language sql
stable
set search_path = public, auth
as $$
  select exists(select 1 from public.org_members where org_id = target_org and user_id = auth.uid());
$$;

create or replace function has_role(target_org uuid, roles role[])
returns boolean
language sql
stable
set search_path = public, auth
as $$
  select exists(select 1 from public.org_members where org_id = target_org and user_id = auth.uid() and role = any(roles));
$$;

-- Enable RLS and policies
alter table organizations enable row level security;
create policy "orgs readable to members" on organizations for select using (uid_in_org(id));
create policy "orgs writable to admins" on organizations for update using (has_role(id, array['admin']::role[])) with check (true);

alter table org_members enable row level security;
create policy "members readable to org" on org_members for select using (user_id = auth.uid());
-- Split action-specific policies
create policy "org_members admin insert"
  on org_members for insert
  with check (has_role(org_id, array['admin']::role[]));

create policy "org_members admin update"
  on org_members for update
  using (has_role(org_id, array['admin']::role[]))
  with check (has_role(org_id, array['admin']::role[]));

create policy "org_members admin delete"
  on org_members for delete
  using (has_role(org_id, array['admin']::role[]));

-- Vendors
alter table vendors enable row level security;
create policy "vendors read by org members" on vendors for select using (uid_in_org(org_id));
create policy "vendors insert by data_entry or admin" on vendors
  for insert with check (has_role(org_id, array['admin','data_entry']::role[]));
create policy "vendors update by data_entry or admin" on vendors
  for update using (has_role(org_id, array['admin','data_entry']::role[]))
  with check (has_role(org_id, array['admin','data_entry']::role[]));
create policy "vendors delete by data_entry or admin" on vendors
  for delete using (has_role(org_id, array['admin','data_entry']::role[]));
-- Per-org vendor name uniqueness (case-insensitive)
create unique index if not exists vendors_org_name_uniq on vendors (org_id, lower(name));

-- Bills
alter table bills enable row level security;
create policy "bills read by org members" on bills for select using (uid_in_org(org_id));
create policy "bills insert by data_entry or admin" on bills
  for insert with check (has_role(org_id, array['admin','data_entry']::role[]));
create policy "bills update by data_entry or accountant or admin" on bills
  for update using (has_role(org_id, array['admin','data_entry','accountant']::role[]))
  with check (has_role(org_id, array['admin','data_entry','accountant']::role[]));

-- Occurrences
alter table bill_occurrences enable row level security;
create policy "occurrences read by org members" on bill_occurrences for select using (uid_in_org(org_id));
create policy "occurrences update by accountant or admin" on bill_occurrences
  for update using (has_role(org_id, array['admin','accountant']::role[]))
  with check (has_role(org_id, array['admin','accountant']::role[]));

-- Projects
alter table projects enable row level security;
create policy "projects read by org members" on projects for select using (uid_in_org(org_id));
create policy "projects insert by data_entry or admin" on projects
  for insert with check (has_role(org_id, array['admin','data_entry']::role[]));
create policy "projects update by data_entry or admin" on projects
  for update using (has_role(org_id, array['admin','data_entry']::role[]))
  with check (has_role(org_id, array['admin','data_entry']::role[]));
create policy "projects delete by admin" on projects
  for delete using (has_role(org_id, array['admin']::role[]));
-- Per-org project name uniqueness (case-insensitive)
create unique index if not exists projects_org_name_uniq on projects (org_id, lower(name));

-- Approvals
alter table approvals enable row level security;
create policy "approvals read by org members" on approvals for select using (uid_in_org(org_id));
create policy "approvals insert by approver or admin" on approvals
  for insert with check (
    has_role(org_id, array['admin','approver']::role[]) and approver_id = auth.uid()
  );
create policy "approvals update by approver or admin" on approvals
  for update using (
    has_role(org_id, array['admin','approver']::role[]) and approver_id = auth.uid()
  )
  with check (
    has_role(org_id, array['admin','approver']::role[]) and approver_id = auth.uid()
  );

-- Payments
alter table payments enable row level security;
create policy "payments read by org members" on payments for select using (uid_in_org(org_id));
create policy "payments insert by accountant or admin" on payments
  for insert with check (has_role(org_id, array['admin','accountant']::role[]));
create policy "payments update by accountant or admin" on payments
  for update using (has_role(org_id, array['admin','accountant']::role[]))
  with check (has_role(org_id, array['admin','accountant']::role[]));

-- Updates
alter table updates enable row level security;
create policy "updates readable by all" on updates for select using (true);
-- No write policies: only service role can write by default

-- Feedback
alter table feedback enable row level security;
create policy "feedback readable by org members or public" on feedback for select using (
  org_id is null or uid_in_org(org_id)
);
create policy "feedback insert by authenticated" on feedback
  for insert with check (author_id = auth.uid());
create policy "feedback update by author" on feedback
  for update using (author_id = auth.uid())
  with check (author_id = auth.uid());
