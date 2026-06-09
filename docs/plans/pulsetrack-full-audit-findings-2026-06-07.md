# PulseTrack — Full Runtime + Code Audit Findings

**Date:** 2026-06-07
**Method:** Live Supabase connection test (curl/PostgREST) + dev server boot + 5 parallel specialist agents (schema-drift, frontend-perf, backend-perf, per-screen, security). Highest-severity items re-verified directly by lead.
**Confidence tags:** ✅ VERIFIED (lead, directly) · 🟢 HIGH (static, consistent) · 🟡 NEEDS-LIVE-CHECK

---

## 1. Environment & connection — ✅ VERIFIED WORKING

- Dev server: `http://localhost:4649` → HTTP 200, Next.js 16.1.6 (Turbopack), ready ~2s.
- Supabase: PostgREST `rest/v1/` → 200 with service-role key. Auth reachable.
- Creds present in `apps/web/.env` (URL, publishable key, service-role key, DATABASE_URL). `.env` is gitignored + untracked (no secret committed).
- Live DB is nearly empty (fresh resume): **companies=1 ("Christian Inc."), users=1, projects=1, project_members=1, activities=1; tickets/time_entries/comments/billing_*/ticket_history/payment_history = 0.**
  → Meaningful screen/perf testing requires SEED DATA.

---

## 2. 🔴 CRITICAL security — privilege escalation (✅ VERIFIED)

**`app/api/auth/signup-complete/route.ts:124,212`** — inserts `role: user.role` taken from the request JSON body via the service-role client (RLS bypassed). No allowlist. DB `users.role` is plain `text default 'user'` with **no CHECK/enum** (verified: only RLS *functions* reference roles; no column constraint).
**Exploit:** signup → verify email (valid bearer) → POST signup-complete with `{user:{id:self,email:self,role:"super_admin"}, company:{...}}` → caller becomes `super_admin` with cross-tenant access.
**Fix:** force role server-side (`z.enum(['company_admin','manager','user'])`, ignore privileged values); add DB CHECK/enum on `users.role`. Do before any real users.

---

## 3. Schema reality — TWO problems

### 3a. Genuine code-vs-reality bugs (columns never existed in any migration) — ✅ VERIFIED via live 400s
27 drift bugs total (15 LIVE-BROKEN, 12 DEAD, 2 RISK). Live-broken hot paths:

| file:line | bad column/value | correct | breaks |
|---|---|---|---|
| performance-metrics-service.ts:63,65,68,99,116,151 | `time_entries.hours`,`.date`,`.company_id`,`.in(project_id)`; `tickets.company_id`,`tickets.creator_id` | `duration`,`start_time`, join via ticket→project, `reporter_id` | dashboard **Performance Metrics** widget 400s |
| priority-insights-service.ts:80,88,99,111,113,121,149 | `tickets.company_id`, `status='blocked'`, `users(...full_name)` embed | join projects.company_id, valid status, `first_name,last_name` + FK hint | dashboard **Priority Insights** widget 400s |
| project-health-service-simple.ts:76,87,105 | `tickets.company_id`, `status==='blocked'`, `projects.end_date` | join projects, valid status, (no end_date) | dashboard **Project Health** wrong/empty |
| app/api/admin/companies/route.ts:31,38,54 | `companies.status`,`.deleted_at`; `users.deleted_at` | (see 3b — also migration-behind) | `/admin/companies` 500 |

DEAD (delete, don't fix): `project-health-service.ts` (full), `billing-queries.ts`, `screens/diagnostics.tsx`, `screens/auth-diagnostic.tsx`, `service.ts getArchivedUsers`.
RISK: `billing-service.ts:85,955` reads `companySettings.default_hourly_rate` (no such column) → **company-default rate tier silently never fires** in billing calc (correctness bug). One FK-join name uses `_fkey` suffix vs codebase `_fk` convention (verify).

### 3b. DB is BEHIND code's migrations — ✅ VERIFIED via live 400s
Live DB missing: `companies.status`, `companies.archived_at`, `companies.deleted_at`, `users.archived_at`, `users.deleted_at`. The hand-written `schema.ts` *claims* `users.archived_at` exists; the DB disagrees. Migration numbering gaps (0013/0014 missing) + loose un-numbered SQL files. → archive/delete + admin companies depend on columns not in this DB.
**Decision needed:** bring DB up to code (apply/repair migrations) OR fix code to the real DB. Likely BOTH (apply archive migration; fix the genuine drift in §3a).

---

## 4. Performance — frontend (🟢 HIGH)

TOP wins:
1. **ticket-board.tsx (1,116 lines): 0 memoization** — `0 useMemo/useCallback/React.memo`. Re-sorts every column + re-renders every card each drag frame (@dnd-kit). Add memo to cards/columns, useMemo per-column sorts, useCallback handlers, hoist inline `sort` object, Map for user lookups.
2. **842KB favicon served raw on every page** (`app/layout.tsx:27`, `app/icon.png` 842KB declared 32×32 — favicons bypass next/image). + `public/cover-banner.png` 2.0MB & `landing-logo.png` 1.36MB are unreferenced dead assets (3.3MB). Resize/delete → ~840KB off every first paint.
3. **jspdf (~350KB) + ComprehensiveBillingModal (~3k lines) eagerly bundled** into billing route (`billing-periods-list.tsx:19-20`) though click-gated. `next/dynamic` both → drop-in.
4. **`refetchOnWindowFocus:true` global** (`query-provider.tsx:16`) + 30s activity/timer polling → tab-switch refetch fan-out. Set false globally (per-hook staleTimes already good).
5. **228 `console.*` shipped to prod** (28 fire per drag frame in ticket-board). Add `compiler.removeConsole` to next.config; delete per-frame drag logs.
6. No list virtualization anywhere; framer-motion eager on login/signup; all-client shell (no SSR/streaming) — medium.

## 5. Performance — backend/data layer (🟢 HIGH; latent — DB near-empty now)

1. **N+1s:** `getProjectHealthSimple` serial 2N+1 (≈101 browser round-trips @ 50 projects); `/api/admin/companies` 3C+1 (≈601 queries @ 200 companies); `getProjectHealth` 5N+1 (dead). Fix: single `.in('project_id',ids)` + JS bucket, or RPC.
2. **Billing report O(entries×rates)** JS aggregation (`billing-service.ts:829`), and `calculateBillingPeriodAmount` builds full nested report just to sum one number. Push to SQL `sum(duration*rate)` / RPC.
3. **dashboard-service mutable-builder reuse BUG** (`:180` baseQuery reused across 3 `.gte().lte()` chains) → compounding filters → **wrong stats**. Plus 5 serial awaits should be `Promise.all`.
4. **Unbounded list fetches** (no limit/range): `getTicketsByCompany`, `getAccessibleTicketsByCompany`, `getTicketsByProject`, `checkTimeEntryIntegrity`. Paginate.
5. **Missing composite indexes**: tickets `(project_id, sort_order DESC, created_at DESC) WHERE deleted_at IS NULL`; time_entries `(user_id, start_time)`; billing_periods `(company_id, payment_status)`, `(company_id, start_date)`; activities `(project_id, created_at)`.
6. **Anti-pattern: `.ilike('notes','%uuid%')`** to find a user's billing periods (target user id encoded in free-text notes) — unindexable scan. Add real `target_user_id` column + index.
7. `updateTicketSortOrders`: 1 UPDATE per card on drag-reorder → single bulk upsert. `select('*')` on wide billing/users tables → field selectors.

## 6. Per-screen / UX (🟡 NEEDS-LIVE-CHECK — agent returned 1 corrupted path; browser-verify)

- Dashboard: **RISKY** — `<PerformanceMetrics>` fetches `metricsError` but never renders an error state → broken card on failure (and it WILL fail, §3a). Add error UI.
- Project detail / project tickets / edit pages: `<Card className="w-96">` (384px) error cards overflow on <375px mobile → `max-w-96 w-full`.
- `/company/users`, `/admin/users` tables: no `overflow-x-auto` → mobile overflow.
- 51+ `console.log` in screens; project-detail owner name hardcoded "Owner" (TODO); icon-only buttons + clickable divs missing aria-labels; modal close button no aria-label.
- Most screens have OK loading/empty/error states.

## 7. RLS / security posture (🟡 NEEDS-LIVE-CHECK)

- **Service-role key: ✅ SAFE** — server-only usage; no `NEXT_PUBLIC_` prefix; tree-shaken from client; `.env` untracked.
- **RLS conflict (HIGH):** 3+ overlapping policy files (`rls_policies.sql` canonical/tight vs `enhanced-rls-policies.sql` + `0015_simplify_users_rls.sql` permissive). Postgres ORs permissive policies → most-permissive wins. `0015` `authenticated_read` lets any authed user read **all users cross-company**; `enhanced` `visibility='public'` leaks project/tickets/time cross-tenant. Canonical file doesn't DROP the enhanced names. **Must query live `pg_policies` to know real posture**, then make one source of truth.
- **/api/billing/report IDOR (HIGH):** caller-supplied `companyId`/`targetUserId` not checked against caller; only RLS backstops.
- **Data layer uses anon browser client server-side (HIGH):** server-invoked service fns without an explicit client run as anon; tenant safety leans on RLS (uncertain) + JS `companyId` filter.
- **Missing Zod** on money-mutating routes (payment-status, periods, payment-history, signup-complete).
- Public `company-assets` bucket (logos world-readable — likely intended). PII in some auth logs (no tokens).

---

## 8. Prioritized action plan (folds into the expansion roadmap's Phase 0)

P0 (security/correctness, do first):
1. Fix C1 privilege escalation + add `users.role` CHECK/enum (✅ verified critical).
2. Query live `pg_policies`; consolidate RLS to one source; kill permissive cross-tenant policies.
3. Reconcile schema: apply/repair archive migration + fix §3a genuine drift (rewrite 3 dashboard services + admin route to proven join patterns in `dashboard-service.ts`); delete dead files.
4. Fix dashboard-service mutable-builder stats bug; fix billing company-default-rate tier.
5. Add error states to dashboard widgets; add Zod to money routes.

P1 (perf quick wins, mostly config/asset):
6. Resize favicon/logo + delete 3.3MB dead images; `removeConsole`; `refetchOnWindowFocus:false`; `next/dynamic` jspdf + billing modal; `optimizePackageImports`.
7. Memoize ticket-board.

P2 (perf at scale): N+1 → batched/RPC; pagination; composite indexes; `target_user_id` column; bulk sort upsert; SQL aggregation.

All P0 items become the FIRST integration tests (they'd have caught every §3a bug).
