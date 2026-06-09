# AGENTS.md

Operational guide for coding agents working in the PulseTrack monorepo.

## 1) Repo Overview

- Monorepo managed with `pnpm` + Turborepo.
- Main app: `apps/web` (Next.js App Router).
- Secondary app: `apps/landing` (Vite).
- Shared packages: `packages/ui`, `packages/eslint-config`, `packages/typescript-config`.
- Backend/data: Supabase + PostgreSQL + Drizzle ORM.

## 2) Package Manager and Runtime

- Default package manager is **pnpm** (`packageManager: pnpm@10.12.4`).
- Use Node.js `>=20`.
- Do not suggest npm/yarn commands unless explicitly requested.

## 3) Install and Bootstrap

```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
```

If running database workflows, ensure `apps/web/.env.local` (or `.env`) contains:

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (or anon fallback)
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (used by invite-user and forgot-password flows for callback URLs)

## 4) Core Build/Test/Lint Commands

From repo root:

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm format
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:rls:apply
```

From `apps/web`:

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm test
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio
pnpm db:rls:apply
```

From `apps/landing`:

```bash
pnpm build
```

## 5) Single-Test and Targeted Test Commands

Current automated tests are Node test-runner files in `apps/web/scripts/*.test.mjs`.

Run all web script tests:

```bash
pnpm --filter web test
```

Run one test file:

```bash
pnpm --filter web exec node --test ./scripts/apply-rls-policies.test.mjs
```

Run one named test case:

```bash
pnpm --filter web exec node --test --test-name-pattern "requireDatabaseUrl" ./scripts/apply-rls-policies.test.mjs
```

Ad hoc integration scripts are in `apps/web/tests/**` and can be run directly with node, e.g.:

```bash
node apps/web/tests/check/check-database.cjs
node apps/web/tests/test/test-invitation-flow.cjs
```

## 6) Required Validation Before Finishing Work

Project guidance requires running:

```bash
pnpm build
pnpm typecheck
```

Also run relevant tests for touched areas (`pnpm --filter web test` at minimum when changing scripts/db tooling).

## 7) Lint Status Note

- `apps/web` currently uses `next lint` script.
- With current dependency set (`next@16` + `eslint@10`), lint can fail due tool/plugin compatibility.
- Keep this in mind when evaluating CI/readiness; do not silently ignore lint issues.

## 8) Database and Migration Workflow (Drizzle-first)

- Drizzle config: `apps/web/drizzle.config.ts`.
- Canonical scripts:
  - `db:generate` -> `drizzle-kit generate`
  - `db:migrate` -> `drizzle-kit migrate`
  - `db:push` -> `drizzle-kit push && pnpm db:rls:apply`
- RLS apply script:
  - `apps/web/scripts/apply-rls-policies.mjs`
  - SQL source: `apps/web/lib/db/migrations/rls_policies.sql`

When modifying schema or policies:

1. Update schema/types.
2. Generate migration (or push in controlled env).
3. Apply RLS policies.
4. Run tests/build/typecheck.

## 9) Architecture and Data Access Rules

- Prefer service-layer DB access from `apps/web/lib/db/service.ts`.
- Do **not** add raw Supabase queries in UI components/screens.
- Data flow convention:
  - Component -> hook (`lib/hooks/*`) -> service -> Supabase/DB.
- Server state: TanStack Query.
- Client state: Zustand stores (not ad hoc global state).
- Forms: React Hook Form + Zod.

## 10) Code Style and Conventions

### TypeScript

- Use TypeScript for new code.
- Avoid `any`; use explicit domain types from `lib/db/schema.ts` and related modules.
- Prefer narrow types, unions, and typed return values for service functions.

### Exports and Modules

- Use **named exports** for components and utilities.
- Avoid default exports unless file already follows that pattern and migration is out of scope.

### Naming

- Components: `PascalCase`.
- Hooks: `useSomething`.
- Files: generally `kebab-case` in app code; follow local folder conventions.
- Constants: `UPPER_SNAKE_CASE` only for true constants.

### Imports

- Use path alias `@/*` in `apps/web` where appropriate.
- Keep imports grouped and sorted (Prettier config in `apps/web/.prettierrc.json`).
- Prefer absolute alias imports over deep relative paths when clarity improves.

### Formatting

- Use Prettier via `pnpm format`.
- Prettier style is established in `apps/web/.prettierrc.json`:
  - single quotes
  - trailing commas
  - bracketSpacing false
  - printWidth 100

### Error Handling

- Fail loudly for missing critical env vars in scripts/server code.
- Use `try/catch` around network/DB boundaries.
- Return structured, actionable errors in API routes.
- Do not swallow errors silently; include context in logs.

### React/Next

- Functional components + hooks.
- Keep server/client boundaries explicit (`'use client'` only when needed).
- Next 16 uses `proxy.ts` instead of `middleware.ts` in this repo.

## 11) Security and Secrets

- Never hardcode secrets, service keys, or DB passwords in code/docs.
- Use env vars for credentials.
- Be careful with RLS SQL changes; policy changes can expose tenant data.
- Validate authorization inside privileged SQL functions, not just in API routes.

## 12) Cursor/Copilot Rule Inputs

Cursor rules exist and should be treated as additional guidance:

- `.cursor/rules/cursor_rules.mdc`
- `.cursor/rules/self_improve.mdc`
- `.cursor/rules/task-list.mdc`
- `.cursor/rules/taskmaster/dev_workflow.mdc`
- `.cursor/rules/taskmaster/taskmaster.mdc`

Copilot instructions file was not found at `.github/copilot-instructions.md`.

## 13) Agent Behavior Expectations

- Keep changes scoped; do not refactor unrelated areas.
- Prefer minimal, reversible changes with clear rationale.
- Update docs/scripts when behavior changes.
- If command/tooling incompatibilities are discovered, document them in PR notes.
- For migration-related work, always include rollback/verification steps.
