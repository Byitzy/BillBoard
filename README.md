# BillBoard

BillBoard is a multi-tenant web app for managing organization bills and project-based expenses with a calendar view, approvals, recurring schedules, installments, and exports. It’s designed for Canadian (Quebec) banking context with holiday-aware business day logic.

## Features

- Multi-org: members and roles per organization.
- Bills & Occurrences: one-off or recurring schedules; optional installments.
- Calendar: month grid with due markers and suggested submission dates.
- Approvals & Accounting: approve/hold, mark paid/failed.
- Vendors & Projects: simple directories per org.
- Quebec banking holidays: previous business day helper for submissions.
- Theme: 2025-style dark/light with system preference and smooth transitions.
- Exports: CSV and PDF (scaffolded).
- CI: GitHub Actions for lint/typecheck/test.

## Tech Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (dark mode: class) + shadcn/ui + Radix UI (planned)
- Supabase (Postgres, Auth, Storage, Edge Functions) with RLS
- Vitest (unit tests) and Playwright (planned smoke tests)
- pnpm 9, ESLint, Prettier

## Project Structure

```
src/
  app/                # Next.js App Router pages/layout
  components/         # UI components (scaffolds)
  lib/                # Utilities (business days, occurrences)
supabase/
  schema.sql          # DB schema, enums, RLS helpers
  edge/
    generate_occurrences/  # Edge Function scaffold (TS outline)
.github/workflows/ci.yml   # CI pipeline (lint, typecheck, test)
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9.x (`npm i -g pnpm@9`)
- A Supabase project (or local Supabase)

### Setup

1. Install dependencies

```
pnpm install
```

2. Configure environment

- Copy `.env.example` to `.env.local` and fill values.
- Required:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_NAME` (optional, defaults BillBoard)
  - `NEXT_PUBLIC_DEFAULT_LOCALE` (default `en-CA`)

Auth (Email Magic Link)

- In Supabase → Authentication → Providers → Email: enable Email provider.
- In Supabase → Authentication → URL Configuration: set Site URL (e.g. `http://localhost:3000`) and add Allowed Redirect `http://localhost:3000/auth/callback`.
- To allow signups via magic link, enable “Allow email signups”. The app is configured to create users via magic link.

3. Database schema

- Apply `supabase/schema.sql` to your Supabase Postgres instance (via Supabase Studio SQL editor or CLI).
- RLS helper functions and example policies are included; extend to all tables as needed.
- Notes:
  - Requires `pgcrypto` extension for `gen_random_uuid()`.
  - `has_role` expects a `role[]` enum array (e.g. `ARRAY['admin','data_entry']::role[]`).

4. Edge Function (Occurrences)

- The generator logic is implemented in `src/lib/occurrences.ts`.
- Port it into a Supabase Edge Function at `supabase/edge/generate_occurrences`.
- Suggested trigger: regenerate occurrences on bill insert/update.

5. Development server

```
pnpm dev
```

App runs at `http://localhost:3000`.

### Theme

- Toggle between Light, Dark, or System from the topbar.
- Remembers choice in `localStorage` and applies on first paint to avoid flash.

### Scripts

- `pnpm dev` – Start Next.js dev server
- `pnpm build` – Build app
- `pnpm start` – Start production server
- `pnpm lint` – ESLint
- `pnpm typecheck` – TypeScript no-emit
- `pnpm test` – Vitest unit tests

## Testing

- Unit tests live under `src/lib/*.test.ts`.
- Run tests:

```
pnpm test
```

If pnpm isn’t available, you can invoke Vitest directly:

```
node node_modules/vitest/vitest.mjs --run
```

## Notable Implementation Details

- Business day helper (Quebec): `src/lib/businessDays.ts`
  - Weekend detection and a set of commonly observed QC/Canada holidays
  - `previousBusinessDay(date)` and `nextBusinessDay(date)` used for submission suggestions
- Occurrence generation: `src/lib/occurrences.ts`
  - Supports monthly/weekly/yearly rules, optional `byMonthDay`, and installments
  - Suggested submission date is computed via previous business day

## CI/CD

- GitHub Actions workflow `.github/workflows/ci.yml` runs on pushes/PRs to `beta` and `main`:
  - `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`
- Recommended flow: use `beta` as the default development branch, merge into `main` for production.

## Roadmap

See `todo.md` for planned sprints and features (auth, RBAC/RLS coverage, tables, exports, polish).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
