# BillBoard  TODO (MVP  GA)

## Sprint 1  Project Bootstrap
- [ ] Init Next.js 14 + TS + App Router + pnpm
- [ ] Tailwind + shadcn/ui + Radix setup; dark mode (class strategy)
- [ ] Supabase project, env wiring, local dev scripts
- [ ] Auth (email magic link + OAuth optionally), profile bootstrap
- [ ] Create base DB schema + enums + triggers (see /supabase/schema.sql)
- [ ] RLS helper functions + core policies
- [ ] Layout shell (sidebar, header, user/org switcher, command palette)
- [ ] GitHub Actions (lint/typecheck/test), Vercel preview on `beta`

## Sprint 2  Core Data & Calendar
- [ ] CRUD: organizations, members (admin), vendors, projects
- [ ] Bills: create one-off & recurring; installments option
- [ ] Edge Function: `generate_occurrences` + triggers
- [ ] Quebec holidays provider + business-day helper
- [ ] Calendar month view with due markers + holiday highlighting
- [ ] Dashboard summary cards + filters

## Sprint 3  Approvals, Payments, Exports
- [ ] Approvals flow (approve/hold) with comments
- [ ] Accountant actions (mark paid/failed, move dates)
- [ ] Attachments upload (RLS-safe storage)
- [ ] CSV export (tables) + PDF export (record/selection)
- [ ] Notifications (in-app); email optional later

## Sprint 4  Settings, Updates, Polish
- [ ] Profile settings (locale, timezone, theme)
- [ ] Organization branding (prefix, logo)
- [ ] Updates tab (changelog) + Feedback submission
- [ ] Analytics/Reports (basic: totals by month/vendor/project)
- [ ] Performance passes, a11y audit, empty states, skeletons

## Backlog / Nice-to-Have
- [ ] ICS calendar export
- [ ] Slack/email reminders (upcoming due, on hold)
- [ ] Saved search views per user
- [ ] Role customizations per org (granular perms)
- [ ] Bulk import from CSV

