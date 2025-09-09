# BillBoard

BillBoard is a multi-tenant web app for managing organization bills and project-based expenses with a calendar view, approvals, recurring schedules, installments, and exports. It’s designed for Canadian (Quebec) banking context with holiday-aware business day logic.

## Features

- **Multi-org**: Members and roles per organization with secure RLS policies
- **Bills & Occurrences**: One-off or recurring schedules with optional installments
- **Calendar**: Month grid with due markers and suggested submission dates
- **Approvals & Accounting**: Approve/hold, mark paid/failed workflow
- **Vendors & Projects**: Simple directories per organization
- **Super Admin System**: System-wide user and organization management
- **Quebec Banking**: Holiday-aware business day logic for submissions
- **Modern UI**: 2025-style dark/light theme with system preference
- **Testing**: Comprehensive E2E testing with Playwright
- **Exports**: CSV and PDF generation
- **Internationalization**: Multi-language support (en-CA, fr-CA, es-ES)

## Tech Stack

- Next.js 15.5.2 (App Router) + TypeScript
- Tailwind CSS (dark mode: class) + shadcn/ui + Radix UI
- Supabase (Postgres, Auth, Storage, Edge Functions) with RLS
- Vitest (unit tests) and Playwright (E2E testing)
- pnpm 9, ESLint, Prettier

## Project Structure

```
src/
  app/                # Next.js App Router pages/layout
  components/         # UI components with shadcn/ui
  lib/                # Utilities (business days, occurrences, Supabase)
  types/              # TypeScript type definitions
tests/
  e2e/                # Playwright E2E tests
supabase/
  schema.sql          # DB schema, enums, RLS helpers
  edge/
    generate_occurrences/  # Edge Function for bill schedules
playwright.config.ts       # Playwright testing configuration
.github/workflows/ci.yml   # CI pipeline (planned)
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
- `pnpm playwright` – Playwright E2E tests

## Testing

### Unit Tests

- Unit tests live under `src/lib/*.test.ts`.
- Run with: `pnpm test`

### End-to-End Tests

- E2E tests live under `tests/e2e/*.spec.ts`
- Multi-browser testing (Chrome, Firefox, Safari)
- Mobile viewport testing
- Accessibility testing

```bash
# Run E2E tests
pnpm playwright

# Visual test runner
pnpm playwright:ui

# Debug mode (step through tests)
pnpm playwright:debug

# Run in headed mode (see browser)
pnpm playwright:headed
```

## Notable Implementation Details

- Business day helper (Quebec): `src/lib/businessDays.ts`
  - Weekend detection and a set of commonly observed QC/Canada holidays
  - `previousBusinessDay(date)` and `nextBusinessDay(date)` used for submission suggestions
- Occurrence generation: `src/lib/occurrences.ts`
  - Supports monthly/weekly/yearly rules, optional `byMonthDay`, and installments
  - Suggested submission date is computed via previous business day

## CI/CD

### Automated Workflows

**CI Pipeline** (`.github/workflows/ci.yml`)

- **Triggers**: Push/PR to `beta` and `main` branches
- **Jobs**:
  - **Lint & Type Check**: ESLint code quality + TypeScript validation
  - **Build & Test**: Production build + unit tests
  - **E2E Tests**: Playwright tests (PR only) with report artifacts
  - **Security Audit**: Dependency vulnerability scanning
- **Features**: Parallel execution, concurrency control, artifact upload

**Deployment Pipeline** (`.github/workflows/deploy.yml`)

- **Triggers**: Push to `main` branch + manual dispatch
- **Jobs**:
  - **Deploy**: Vercel production deployment with security audit
  - **Notify**: Deployment status reporting
- **Environment**: Production environment protection

### Recommended Git Flow

- **Development**: Use `beta` as default branch for feature development
- **Production**: Merge `beta` → `main` triggers automatic deployment
- **Hotfixes**: Direct commits to `main` for emergency fixes

## Roadmap

See `todo.md` for planned sprints and features (auth, RBAC/RLS coverage, tables, exports, polish).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
