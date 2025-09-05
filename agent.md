# BillBoard  Builder Agent Guide

## Mission
Build **BillBoard**, a multi-tenant web app that helps organizations manage project-based expenses/bills with a calendar dashboard, Quebec banking holiday awareness, roles/permissions, approvals, recurring schedules, installments, exports, and a polished, consistent UI (light + sleek dark mode).

## Tech Stack (must use)
- **Frontend**: Next.js 14 (App Router, TypeScript), Tailwind CSS, shadcn/ui + Radix UI, React Hook Form + Zod, TanStack Table & Query.
- **Auth & DB**: Supabase (Postgres, Auth, Storage, Edge Functions) with RLS for multi-tenancy.
- **Deployment**: Vercel (Preview deployments for PRs). Env via Vercel + local `.env`.
- **Tooling**: pnpm, ESLint, Prettier, Vitest/Playwright (smoke tests), Commitlint (Conventional Commits).
- **Dates/Intl**: `date-fns` + `date-fns-business-days` (or equivalent) + `date-holidays` region `CA-QC` for Quebec holidays; timezone **America/Toronto**; locale **en-CA** / **fr-CA**.
- **PDF/CSV**: `pdfmake` (server/client) or serverless Chromium for PDF; CSV via `papaparse`.

## Branching & CI/CD
- Default development branch: **`beta`** (PRs -> preview on Vercel).
- Merge `beta`  `main` only after QA sign-off.
- GitHub Actions: lint, typecheck, test; on success, auto-deploy preview to Vercel (beta), production on `main`.

## High-Level Features (MVP v0)
1. **Multi-Org**: users can belong to multiple organizations with role-based access.
2. **Projects** per org; each project has bills (one-off or recurring).
3. **Vendors** directory (per org).
4. **Bills & Occurrences**  
   - Create one-off bills or define **recurring schedules** (e.g., monthly insurance).  
   - Generate **bill occurrences**; allow **installments** (split annual into 12).  
   - If due date lands on weekend or Quebec banking holiday, auto-suggest the **previous business day** for submission.  
   - If a payment didnt process, users can **move the occurrence** to a new date (audit logged).
5. **Approvals**: Approvers can approve/hold; Accounting marks paid/failed; comments & attachments.
6. **Dashboard + Calendar**: month grid with daily bill markers, filters, and a suggested submission date badge when adjusted.
7. **RBAC**: roles = `admin`, `approver`, `accountant`, `data_entry`, `analyst`, `viewer`. Fine-grained capabilities listed below.
8. **Search/Filters** everywhere + quick actions + keyboard shortcuts (Cmd/Ctrl+K).
9. **Exports**: table exports to CSV; selection/record export to PDF.
10. **Settings**: profile (name, locale, timezone, notification prefs), organization branding (prefix e.g., Voxtures BillBoard), user management (admins only).
11. **Updates**: in-app changelog; submit feedback/feature requests.
12. **UX**: responsive, accessible (WCAG AA), smooth empty states, skeleton loaders, optimistic UI where safe.

## Data Model (Supabase / Postgres)
> All tables use `id uuid default gen_random_uuid()` and `created_at timestamptz default now()`, `updated_at` triggers.

- `organizations`  
  - `name`, `slug`, `branding_prefix`, `theme` (jsonb), `logo_url`
- `org_members`  
  - `org_id -> organizations`, `user_id -> auth.users`, `role` (enum: admin, approver, accountant, data_entry, analyst, viewer), **unique (org_id, user_id)**
- `projects`  
  - `org_id`, `name`, `code`, `description`, `status`
- `vendors`  
  - `org_id`, `name`, `account_number`, `contact`, `email`, `phone`, `notes`, `tags text[]`
- `bills` (the master item)  
  - `org_id`, `project_id`, `vendor_id`, `title`, `description`, `currency` (default CAD), `amount_total numeric(14,2)`, `category`, `due_date` (nullable if recurring),  
  - `recurring_rule jsonb` (RFC 5545-ish or custom: `{frequency:'monthly', interval:1, byMonthDay:15, start_date, end_date, proration?, installments?:12}`),  
  - `installments_total int` (nullable), `status` (draft|active|archived)
- `bill_occurrences` (computed instances incl. installments)  
  - `org_id`, `bill_id`, `project_id`, `vendor_id`, `sequence int` (1..n),  
  - `amount_due numeric(14,2)`, `due_date date`, `suggested_submission_date date`,  
  - `state` (scheduled|pending_approval|approved|on_hold|paid|failed|canceled),  
  - `moved_from_date date` (if user reschedules), `notes`
- `approvals`  
  - `org_id`, `bill_occurrence_id`, `approver_id`, `decision` (approved|hold), `comment`, `decided_at`
- `payments` (optional for reconciliation)  
  - `org_id`, `bill_occurrence_id`, `method`, `reference`, `paid_at`, `amount_paid`
- `attachments` (files in Supabase Storage, bucket `billboard`)  
  - `org_id`, `linked_type` ('bill'|'occurrence'|'vendor'|'project'), `linked_id uuid`, `file_path`, `mime`
- `comments`  
  - `org_id`, `linked_type`, `linked_id`, `author_id`, `body`
- `updates` (changelog entries)  
  - `title`, `body_md`, `published_at`, `tags text[]`
- `feedback`  
  - `org_id` (nullable for global), `author_id`, `type` (bug|feature|idea), `title`, `body`, `status` (open|in_review|planned|shipped|closed)
- `notifications`  
  - `org_id`, `user_id`, `type`, `payload jsonb`, `read_at`
- `audit_log`  
  - `org_id`, `actor_id`, `action`, `target_type`, `target_id`, `diff jsonb`, `ip`, `user_agent`

### Indices/Constraints
- Index foreign keys and high-cardinality filters (`org_id`, `project_id`, `vendor_id`, `state`, `due_date`).
- Unique: `org_members(org_id, user_id)`.
- Ensure `bill_occurrences` unique on (`bill_id`, `sequence`).

### RBAC & Capabilities
- `admin`: manage org, members, roles, settings, all data.
- `approver`: view bills/occurrences, change state to approved/hold, comment, view exports.
- `accountant`: mark paid/failed, edit due dates (with audit), export.
- `data_entry`: create/edit vendors, bills, projects; upload attachments; cannot approve/pay.
- `analyst`: read-only + exports.
- `viewer`: read-only, no exports unless granted.
> Roles enforced via RLS; actions validated in API routes/edge functions.

## RLS (Row-Level Security)  Supabase
1. Enable RLS on all multi-tenant tables.  
2. Helper function:

```sql
create or replace function auth.uid_in_org(target_org uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from org_members
    where org_id = target_org and user_id = auth.uid()
  );
$$;
```

3. Example policy (read):

```sql
alter table projects enable row level security;

create policy "org readers"
on projects
for select
using (auth.uid_in_org(org_id));
```

4. Example policy (mutations based on role):

```sql
create or replace function auth.has_role(target_org uuid, roles text[])
returns boolean language sql stable as $$
  select exists (
    select 1 from org_members
    where org_id = target_org and user_id = auth.uid() and role = any(roles)
  );
$$;

create policy "data entry writes"
on bills
for insert with check (auth.has_role(org_id, array['admin','data_entry']))
, update using (auth.has_role(org_id, array['admin','data_entry','accountant']));
```

5. Similar policies for `bill_occurrences` (accountant can update dates/state; approver can set approval state via `approvals`).

## Holiday & Business-Day Logic

* Use `date-holidays` with region `CA-QC` to fetch Quebec holidays that impact banking.
* Use a helper to compute **previous business day** if due date falls on weekend/holiday:

  * `suggested_submission_date = previousBusinessDay(due_date)`
* Store computed suggestion on each occurrence; display a badge and an inline action Move to suggested date.

## Occurrence Generation (Edge Function)

* **Edge Function** `generate_occurrences`:

  * Inputs: `bill_id` (or run nightly batch per org).
  * If `bills.recurring_rule` is set, compute occurrences from `start_date`  min(`end_date`, +18 months horizon).
  * If `installments_total` present, split `amount_total` evenly; remainder to first installment.
  * For each occurrence: set `due_date`, `suggested_submission_date`.
* Trigger: on `bills` insert/update, enqueue regeneration. On delete, soft-delete occurrences not yet paid.

## Moving Occurrences

* Mutation endpoint/Edge Function `move_occurrence_date`:

  * Input: `occurrence_id`, `new_due_date`.
  * Record `moved_from_date`, append to `audit_log`, recompute `suggested_submission_date`.

## Approvals

* Approver posts an `approvals` row; latest decision drives `bill_occurrences.state` (`approved` or `on_hold`).

## UI/UX Requirements

* **Calendar View**: Month grid, each day lists due occurrences with status chips and vendor/project. Tooltip shows submission suggestion if adjusted. Quebec holidays highlighted.
* **Dashboard**: Summary cards (This Month Due, Approved, On Hold, Paid, Overdue); quick filters; saved views.
* **Tables**: Column filters, global search, multi-select, sticky header/footer, CSV/PDF export.
* **Dark Mode**: System-aware; persisted per user.
* **Branding**: Show {org.branding\_prefix} BillBoard in header.
* **Accessibility**: Focus states, ARIA labels, color-contrast, keyboard nav; cmd/ctrl+K command palette.
* **Attachments**: Drag-and-drop, previews for PDFs/images.

## Pages (App Router)

```
/ (redirect to /dashboard)
/dashboard
/calendar
/bills            (list + create)
/bills/[id]       (details, occurrences, approvals, attachments)
/vendors
/projects
/reports
/updates          (changelog + feedback submit)
/settings/profile
/settings/organization
/admin/users      (admins only)
```

## Storage

* Supabase bucket `billboard` with RLS: only org members can read/write files within their org prefix: `org_<org_id>/*`.

## I18n & Locale

* `next-intl` or `react-i18next` with **en-CA** and **fr-CA** (Quebec French).
* Currency formatting: `Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'})` (adapt per user locale).

## Testing

* Vitest: unit tests for date utilities & RBAC guards.
* Playwright: smoke test login, create org, vendor, bill, see calendar dot on due day.

## ENV (example)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_NAME=BillBoard
NEXT_PUBLIC_DEFAULT_LOCALE=en-CA
```

## Commit Convention

`type(scope): message` e.g., `feat(calendar): show suggested submission badge`.

