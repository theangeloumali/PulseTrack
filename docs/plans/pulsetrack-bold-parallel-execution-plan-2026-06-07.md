# PulseTrack — BOLD Parallel Execution Plan

**Date:** 2026-06-07
**Inputs:** `pulsetrack-full-audit-findings-2026-06-07.md` + `pulsetrack-agency-platform-expansion-and-codebase-audit-2026-06-07.md`
**Model:** Themed agent squads running in PARALLEL with exclusive file ownership (worktree-isolated) + a migration coordinator. Two headline priorities: **(1) PAGE LOAD TIME** and **(2) CLIENT MANAGEMENT**.

---

## 0. Two headline outcomes (everything else serves these)

1. **PAGE LOAD — make every page fast.** Target (production, mid-tier mobile, throttled 4G): **LCP < 2.0s, TTI < 2.5s, route JS < 200KB gz, Lighthouse Perf ≥ 90.** Today: ~5.7MB oversized images, 823KB favicon on every page, 90 client components (blank-until-auth), jspdf/framer-motion eagerly bundled.
2. **CLIENT MANAGEMENT (immediate)** — as a company owner with many clients: **see ALL clients → who the persons-in-charge are per client → what projects each client has.**

---

## 1. Measured load baseline (2026-06-07, dev)

| Signal | Value | Note |
|---|---|---|
| `/`, `/login`, `/signup` HTML | 27–37ms, ~30KB | TTFB fine (dev, warm) |
| `icon.png` favicon | **823 KB** every page | declared 32×32; favicons bypass next/image |
| `cover-banner.png` / `landing-logo.png` | 1966 / 1326 KB | **unreferenced dead assets** |
| `'use client'` files | **90** | SPA, no server HTML/streaming |
| Real LCP/TTI/bundle | UNKNOWN | needs prod build + Lighthouse → Squad CHARLIE task #1 |

---

## 2. Parallel execution model

```
 WAVE 0 — FOUNDATION (4 agents, parallel, ~4h wall)  [unblocks safe parallelism]
 ┌────────────┬───────────────┬───────────────┬──────────────────┐
 │ F1 split   │ F2 migration  │ F3 test       │ F4 LOAD BASELINE │
 │ service.ts │ reconcile +   │ harness + CI  │ prod build +     │
 │ → domains  │ Drizzle types │ + seed script │ bundle + LH      │
 │ (Marcus)   │ (Jordan/Ravi) │ (Maya/Jordan) │ (Lena/Jordan)    │
 └─────┬──────┴───────┬───────┴───────┬───────┴────────┬─────────┘
       └──────────────┴───── gate ────┴────────────────┘
                              ▼
 WAVE 1 — 5 SQUADS (parallel, worktree-isolated, ~10h wall)
 ┌───────────┬────────────┬──────────────┬─────────────┬──────────────┐
 │ ALPHA     │ BRAVO      │ CHARLIE ★    │ DELTA       │ ECHO ★       │
 │ Security  │ Data fix   │ PAGE LOAD    │ Backend     │ CLIENT MGMT  │
 │ (Kai)     │ (Ravi)     │ (Lena)       │ scale(Ravi2)│ (Ravi+Lena+  │
 │           │            │              │             │  Priya)      │
 └─────┬─────┴─────┬──────┴──────┬───────┴──────┬──────┴──────┬───────┘
       └───────────┴──── migration coordinator ─┴─────────────┘
                              ▼
 WAVE 2 — INTEGRATE + VERIFY (sequential gate, ~5h)
   Maya integration tests + Playwright smoke + Lighthouse vs baseline
   Kai security re-verify (pg_policies) · Ravi migration fwd/back · Marcus merge gate
```

★ = headline-priority squads (page load + client management).

---

## 3. WAVE 0 — Foundation (parallel; gates Wave 1)

| ID | Owner | Scope | Done when | with / without |
|---|---|---|---|---|
| F1 | Marcus | Split `service.ts` (2,282 lines) → `companies/projects/tickets/time/activities/users/project-access`-service.ts. Publish the FILE-OWNERSHIP MAP. | tsc clean; each domain file <400 lines; imports updated | 4h / 16h |
| F2 | Jordan+Ravi | Reconcile live DB vs migrations: diff columns, apply/repair archive migration, close 0013/0014 gap, fold loose `*.sql`, set Drizzle as type source-of-truth (codegen). Become the MIGRATION COORDINATOR for Wave 1. | DB == migrations; `pnpm migration:run` clean fwd+back | 4h / 12h |
| F3 | Maya+Jordan | Vitest (unit) + Playwright (e2e) + GitHub Actions gate + **seed script** (tagged `audit-seed`, removable) producing realistic clients/projects/tickets/time/billing. | `pnpm test` runs; seed+teardown work | 4h / 14h |
| F4 | Lena+Jordan | **Page-load baseline**: `next build`, `@next/bundle-analyzer`, Lighthouse per route → record LCP/TTI/JS-size to beat. | baseline numbers committed to this doc | 1.5h / 4h |

---

## 4. WAVE 1 — Parallel squads

### SQUAD ALPHA — Security (Kai)  — 6h / 22h
- **C1 (CRITICAL):** force role server-side in `signup-complete` (`z.enum`), add DB CHECK/enum on `users.role`.
- RLS: query live `pg_policies`; make `rls_policies.sql` the single source; DROP permissive `0015`/`enhanced` policies; delete stale `.sql`.
- `/api/billing/report` IDOR: verify `companyId`/`targetUserId` vs caller.
- Zod on money routes (payment-status, periods, payment-history, signup-complete). `withAuth` → `server-only`. Delete `auth-diagnostic`.
- **Owns:** `app/api/auth/*`, `app/api/billing/*` (validation only), `lib/auth-utils.ts`, `*.sql` policies.

### SQUAD BRAVO — Data correctness (Ravi)  — 6h / 22h
- Rewrite `performance-metrics-service`, `priority-insights-service`, `project-health-service-simple` to REAL schema (reuse `dashboard-service` join patterns: `projects!inner(company_id)`, `duration`/`start_time`, `reporter_id`).
- Fix `dashboard-service` mutable-builder stats bug; fix billing company-default-rate tier (`default_hourly_rate` phantom).
- Delete dead: `project-health-service.ts`, `billing-queries.ts`, `diagnostics.tsx`, `getArchivedUsers`. Add error states to dashboard widgets.
- **Owns:** `lib/db/{performance-metrics,priority-insights,project-health*,dashboard,billing}-service.ts`, `components/dashboard/*`.

### SQUAD CHARLIE ★ — PAGE LOAD / Frontend perf (Lena)  — 10h / 36h
- **Asset diet:** resize favicon/app-logo to real sizes; delete `cover-banner.png`+`landing-logo.png` (dead) → ~5.5MB off.
- **Bundle:** `next/dynamic` jspdf PDFExporter + ComprehensiveBillingModal; lazy-load diagnostics; `optimizePackageImports:['framer-motion','@headlessui/react']`.
- **Config:** `compiler.removeConsole`, global `refetchOnWindowFocus:false`.
- **Architecture (biggest LCP win):** convert list/detail screens (projects, tickets, billing, settings, clients) from `'use client'` SPA to **Server Components + Suspense streaming** so the shell paints before data; keep islands client-side.
- **Runtime:** memoize `ticket-board.tsx` (React.memo cards/columns, useMemo sorts, useCallback handlers); add `@tanstack/react-virtual` to board/long tables.
- **Owns:** `next.config.mjs`, `app/layout.tsx`, `public/*`, `components/query-provider.tsx`, `components/tickets/ticket-board.tsx`, screen perf refactors (coordinate file-locks with ECHO on shared screens).

### SQUAD DELTA — Backend scale (Ravi #2, post-split files)  — 8h / 30h
- Kill N+1: `getProjectHealthSimple` (2N+1→3), `/api/admin/companies` (3C+1→grouped), via `.in(ids)`+JS-bucket or RPC.
- Pagination (`.range()`) on ticket/time/integrity list reads.
- Composite indexes (tickets, time_entries, billing_periods, activities) + replace `notes` ilike with real `target_user_id` column.
- Bulk `upsert` for `updateTicketSortOrders`; SQL aggregation for totals; field selectors over `select('*')`.
- **Owns:** `lib/db/{tickets,time,activities}-service.ts` (post-split), `queries.ts`, `app/api/admin/companies/route.ts`; **migrations via F2 coordinator**.

### SQUAD ECHO ★ — CLIENT MANAGEMENT feature (Ravi+Lena+Priya)  — 10h / 34h
The immediate deliverable. Data model + 2 screens. (Owner-preview personas come later per expansion roadmap.)
- **Migration (via F2 coordinator):** `clients`, `client_contacts`, `projects.client_id`.
- **Backend:** `lib/db/clients-service.ts` (CRUD + `getClientsWithCounts`, `getClientDetail` = client + contacts + projects), `lib/hooks/useClients.ts`.
- **Screens:** `/clients` LIST + `/clients/[id]` DETAIL (reuse `company-users` table + `projects` card patterns).
- **Owns:** new files only (`lib/db/clients-service.ts`, `lib/hooks/useClients.ts`, `screens/clients.tsx`, `screens/client-detail.tsx`, `app/clients/**`), sidebar nav entry, migration.

---

## 5. CLIENT MANAGEMENT — data model + screens (ASCII)

```
 DATA MODEL (additive)
 ┌─────────────┐ 1     ∞ ┌──────────────────┐
 │  companies  │─────────│     clients      │   (your agency → your clients)
 │ (your org)  │         │ id, company_id   │
 └─────────────┘         │ name, status     │
                         │ owner_id (acct   │
                         │   manager=user)  │
                         └───┬──────────┬───┘
              1 ∞            │          │ 1            ∞
        ┌──────────────────┘          └──────────────────┐
        ▼                                                 ▼
 ┌────────────────────┐                        ┌────────────────────┐
 │  client_contacts   │  "persons in charge"   │  projects          │
 │ id, client_id      │                        │ +client_id (NEW FK)│
 │ name, email, phone │                        │ name, status, …    │
 │ title, is_primary  │                        └────────────────────┘
 └────────────────────┘

 SCREEN FLOW
 /clients (LIST)                        /clients/[id] (DETAIL)
 ┌───────────────────────────────┐     ┌────────────────────────────────────┐
 │ Clients            [+ Client] │     │ ◀ Acme Corp        status · manager │
 │ ─────────────────────────────│     │ ───────────────────────────────────│
 │ Name      Contacts Projects ▸│ ──▶ │ PERSONS IN CHARGE     [+ Contact]   │
 │ Acme Corp     3       4      │     │  • Jane Doe — PM (primary)          │
 │ Globex        1       2      │     │  • John Roe — Finance               │
 │ Initech       2       1      │     │ ───────────────────────────────────│
 │ (empty → "Add your first      │     │ PROJECTS (4)          [+ Project]   │
 │  client" CTA)                 │     │  • Website Revamp   active   62% ▸  │
 └───────────────────────────────┘     │  • Mobile App       active   30% ▸  │
                                        └────────────────────────────────────┘
 Answers: all clients ✓ · persons-in-charge per client ✓ · projects per client ✓
```

---

## 6. PAGE LOAD — before → after (ASCII)

```
 BEFORE                                  AFTER (Squad CHARLIE)
 ┌───────────────────────────┐          ┌───────────────────────────┐
 │ 823KB favicon every page  │          │ <5KB favicon              │
 │ +5.7MB PNGs (2 dead)      │   ───▶   │ dead PNGs deleted, logos  │
 │ jspdf+modals eager        │          │   right-sized             │
 │ 90 'use client' (blank    │          │ jspdf/modals lazy         │
 │   until auth)             │          │ list/detail = Server      │
 │ refetch-on-focus storms   │          │   Components + streaming  │
 │ ticket-board re-render     │          │ focus refetch off         │
 │   storm on drag           │          │ board memoized+virtualized│
 └───────────────────────────┘          └───────────────────────────┘
        LCP unknown/slow                    target LCP<2.0s, Perf≥90
```

---

## 7. Collision & dependency management
- **File-exclusive ownership** per squad (table above). No two squads edit the same file.
- **Shared-screen risk** (CHARLIE perf-refactors screens; ECHO adds client screens): ECHO touches NEW files only; CHARLIE avoids `clients*` files. Sidebar nav edited by ECHO only.
- **Migrations:** F2 is the SOLE migration coordinator in Wave 1 — DELTA and ECHO submit migration intents; F2 serializes numbering. Prevents migration-number collisions.
- **Worktrees** (`superpowers:using-git-worktrees`) per squad for filesystem-level isolation.
- **Gate chain** after Wave 1: prettier → lint → tsc → unit → integration → build → runtime smoke (browser) → Lighthouse-vs-baseline → review (Sam/Maya/Kai).

---

## 8. Estimates

| Wave | Serial effort (with Claude) | Without Claude | Parallel WALL-CLOCK (with Claude) |
|---|---|---|---|
| 0 Foundation | 13.5h | 46h | ~4h |
| 1 Squads (×5) | 40h | 144h | ~10h |
| 2 Integrate/verify | 5h | 18h | ~5h |
| **TOTAL** | **~58.5h** | **~208h** | **~19h wall-clock** |

Parallel agent execution: **~19h wall-clock vs ~208h solo-without-Claude (~11x), ~58h vs ~208h on raw effort (~3.5x, 72% saved).**

---

## 9. What's still needed from the human
1. **A login** (existing "Christian Inc." user creds) OR OK to mint a test admin via service-role → Wave 2 browser smoke + live dashboard verification.
2. **Permission to seed** tagged test data (F3) → exercises kanban/billing/client screens + realistic Lighthouse.
3. **Go-ahead** to dispatch Wave 0 (then Wave 1 squads).

## 10. Sequencing
Dispatch Wave 0 (4 parallel agents) → gate → dispatch Wave 1 (5 parallel squads, worktree-isolated) → gate chain → Wave 2 verify → merge. C1 security fix can be pulled FORWARD into Wave 0 if desired (it's isolated).
