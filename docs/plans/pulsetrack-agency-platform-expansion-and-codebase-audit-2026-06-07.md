# PulseTrack → Agency Platform: Expansion Roadmap & Codebase Audit

**Date:** 2026-06-07
**Author:** ZKidz Dev Team (Marcus coordinating) — evidence-based audit, no assumptions
**Status:** REVISED (Rev 2) after deep direct scan — see §9. Awaiting 1 decision (persona model scope).

---

## 0. TL;DR

- **Libraries are CURRENT, not outdated.** Next.js 16.1.6 · React 19.2.4 · Tailwind 4.2 · Zod 4.3 · Drizzle 0.45 · TanStack Query 5.90 · TS 5.9 · pnpm 10.12. No major migration needed.
- **Verdict: REFACTOR, not rewrite.** Data-flow pattern is clean (Component → hook → service → Supabase), minimal leakage, shared `withAuth()`. The foundation is sound.
- **Two real debts:** a 2,282-line `service.ts` god-file and **zero test coverage**. Both must be fixed BEFORE feature growth.
- **Two structural data gaps:** no `client` entity; billing is one-directional (no freelancer-bills-you flow).
- **Core build (Phases 0–4): ~66h with Claude vs ~235h without (~3.6x, ~72% saved).**

---

## 1. Library / Dependency Audit (evidence)

| Package | Pinned | Status |
|---|---|---|
| next | 16.1.6 | current |
| react / react-dom | 19.2.4 | current |
| typescript | 5.9.3 | current |
| tailwindcss | 4.2.0 | current |
| zod | 4.3.6 | current |
| zustand | 5.0.11 | current |
| drizzle-orm / drizzle-kit | 0.45.1 / 0.31.8 | current |
| @tanstack/react-query | 5.90.21 | current |
| @supabase/supabase-js / ssr | 2.97.0 / 0.8.0 | current (v3 exists; not urgent) |
| react-hook-form | 7.71.2 | current |
| turbo | 2.8.10 | current |
| eslint / prettier | 10.0.1 / 3.8.1 | current |

**Cleanups (trivial):** remove deprecated `@types/jspdf`; audit transitive `glob` (security); add `.nvmrc` (Node 20); consider `vercel.ts`; upgrade Vercel CLI 53→54.

**Red flag:** `CLAUDE.md` says "Next.js 15" — stale, it's 16. Elena to fix.

---

## 2. Architecture Health (evidence)

**Hotspots (files > 400 lines):**

| File | Lines | Risk |
|---|---|---|
| lib/db/service.ts | 2,282 (76 fns) | CRITICAL — god file |
| lib/db/billing-service.ts | 1,434 | high |
| components/tickets/ticket-board.tsx | 1,116 | high |
| screens/billing.tsx | 992 | high |
| screens/diagnostics.tsx | 895 | DELETE (debug) |
| lib/stores/auth.ts | 803 | split signup flow |
| screens/auth-diagnostic.tsx | 787 | DELETE (debug) |

**Findings (ranked):**
1. 🔴 `service.ts` god-file — split into domain services (companies/projects/tickets/time/activities).
2. 🔴 **Zero tests** — no Vitest/Jest/Playwright, no CI. Refactoring is currently high-risk.
3. 🟠 11 files > 400 lines — split as touched.
4. 🟠 Hand-written types NOT derived from Drizzle (schema exists but "migrations only"). Risk: type drift.
5. 🟡 70 `: any` + 28 `as any` (clustered in billing/time-tracking/auth).
6. 🟡 52% `'use client'` — SSR underused; perceived-speed cost.
7. 🟡 No error monitoring (Sentry).
8. 🟡 Debug screens leak auth/session internals — security + dead code.

**Good (reuse with confidence):** auth flows (signup/verify/reset/invite), billing periods+rates+payment tracking+PDF gen (~70% of a billing system), time tracking, kanban+list tickets, dashboard, role-based access hooks, admin panels, `@workspace/ui` primitives.

---

## 3. Target Architecture (ASCII)

```
                          PULSETRACK — AGENCY PLATFORM (single-tenant v1)
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │  app/ (Next.js 16 App Router)                                                   │
  │   ├─ (server components — list/detail, streamed)   ◄── perf win: convert here  │
  │   ├─ api/ route handlers  ── withAuth() + zod ──┐                               │
  │   └─ screens/ (client)                          │                               │
  └─────────────┬───────────────────────────────────┼──────────────────────────────┘
                │ hooks (TanStack Query)             │
                ▼                                     ▼
  ┌──────────────────────────────┐    ┌──────────────────────────────────────────┐
  │  DOMAIN SERVICES (split)     │    │  RATE RESOLVER + TIME ROUTER (new)         │
  │  companies · clients ·       │    │  getEffectiveRate(user, project, date)     │
  │  projects · tickets ·        │    │  routeTimeEntry → inbound + outbound line  │
  │  time · billing(in/out)      │    └──────────────────────────────────────────┘
  └─────────────┬────────────────┘
                ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │  SUPABASE (Postgres + RLS helpers: is_internal(uid), project_access(uid))      │
  └──────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Model — Current vs Target

**Current entities:** companies (= tenant), users (1 company, role hierarchy), projects (owner=user), project_members (lead/member only), tickets, time_entries, comments, billing_periods (ONE-SIDED), billing_rates, company_billing_settings, time_entry_billing, ticket_history, activities, payment_history.

**Gap analysis:**

| Target concept | Exists? | Resolution |
|---|---|---|
| Client (external) | ❌ | NEW `clients` |
| Client contact | ❌ | NEW `client_contacts` |
| Project ↔ Client link | ❌ | extend `projects.client_id` |
| Freelancer per-project rate/contract | ⚠ partial | extend `project_members` (rate, is_contractor, contract dates) |
| Employee/contractor/client distinction | ❌ | extend `users.user_type` |
| Inbound invoice (freelancer → you) | ❌ | NEW `employee_invoices` + line items |
| Outbound invoice (you → client) | ⚠ one-sided | refactor `billing_periods` → `client_invoices` + line items |
| One hour → both invoices | ❌ | extend `time_entries` routing fields |
| Deliverables / expectations / schedule | ❌ | NEW `deliverables` (milestones) |

**Two-sided billing flow (ASCII):**

```
  freelancer/employee                YOU (agency)                    client
        │ logs time                       │                            │
        ▼                                 │                            │
   time_entry ── routed ──┬──► employee_invoice_line  (rate: cost)     │
                          │        └► employee_invoice (submit→approve→pay)
                          │                                            │
                          └──► client_invoice_line   (rate: bill)      │
                                   └► client_invoice ──── sent ───────►│ (draft→sent→paid)
                                                                        ▼
                                                              margin = bill − cost
```

**Expanded ER (abridged):**

```
companies(1)──<(users)         clients(1)──<(client_contacts)
companies(1)──<(clients)       clients(1)──<(projects)
projects(1)──<(project_members[+rate,is_contractor,contract])
projects(1)──<(tickets)──<(time_entries)
projects(1)──<(deliverables)
time_entries ──► employee_invoice_line_items >──(1)employee_invoices ──(employee:users)
time_entries ──► client_invoice_line_items   >──(1)client_invoices   ──(1)clients
```

---

## 5. Top 10 Data-Modeling Risks (and mitigations)

1. **Tenancy scope** — keep `company_id` mandatory; clients are read-only external entities (no login in v1).
2. **billing_periods refactor** — deprecate, build `client_invoices`, write data-migration script, feature-flag endpoints.
3. **Payment direction ambiguity** — separate inbound/outbound tables + distinct status enums.
4. **Rate precedence** — one resolver: project rate > billing_rates(match) > user.hourly_rate; snapshot rate on every line (immutable).
5. **Time routing** — explicit `billable_to_type`; generate both line items from one entry with audit link.
6. **Contractor vs employee** — `user_type` + RLS so contractors see only assigned projects/own invoices.
7. **Project ownership** — `owner_id` = internal PM; optional `primary_client_contact_id`.
8. **Approval workflows** — distinct state machines: employee(draft→submitted→approved/rejected→paid), client(draft→sent→partial/paid/overdue).
9. **Multi-currency** — currency per invoice + per line; capture FX at generation.
10. **RLS explosion** — centralize via SQL helper functions; write RLS tests; document role×table×action matrix.

---

## 6. Phased Roadmap (owners + estimates)

> Estimates: senior eng WITH Claude Code | WITHOUT. Reuse-adjusted (mature codebase).

### Phase 0 — De-risk foundation (HARD GATE) — Maya, Marcus, Jordan
- Vitest + Playwright harness; first billing-math tests — 3h | 12h
- Split `service.ts` → domain services — 4h | 16h
- Drizzle as type source-of-truth (codegen) — 3h | 10h
- Delete debug screens/routes (diagnostics, auth-diagnostic) — 1h | 3h
- CI (lint/typecheck/build/test) + Sentry + .nvmrc — 3.5h | 10h
- **Subtotal ~15h | ~51h**

### Phase 1 — Client management — Ravi, Lena
- `clients` + `client_contacts` + migration + RLS — 3h | 10h
- `projects.client_id` link + backfill — 1.5h | 4h
- Client CRUD service + hooks + screens (clone company-users) — 5h | 20h
- **Subtotal ~10h | ~34h**

### Phase 2 — Freelancer-per-project — Ravi, Lena, Kai
- `project_members` extend (rate, is_contractor, contract dates) — 2.5h | 8h
- `users.user_type` + permission gates — 2h | 6h
- "Who's on what + pending tasks per person" view — 4h | 16h
- **Subtotal ~9h | ~30h**

### Phase 3 — Two-sided billing (heaviest) ⚠ — Ravi, Kai, Maya
- `employee_invoices` + line items + workflow (inbound) — 6h | 24h
- Refactor `billing_periods` → `client_invoices` + lines + data migration — 8h | 30h
- Time routing + rate resolver — 4h | 14h
- RLS overhaul + tests — 4h | 16h
- Dual-direction invoice PDF (reuse generator) — 2h | 8h
- **Subtotal ~24h | ~92h**

### Phase 4 — Expectations & schedules — Lena, Ravi
- `deliverables`/milestones + UI — 4h | 14h
- Client expectations + timeline/schedule view — 4h | 14h
- **Subtotal ~8h | ~28h**

### Phase 5 — Optional — Lena, Kai
- Read-only client portal — 8h | 30h
- Perf: SSR conversion + code-split large screens — 5h | 16h
- **Subtotal ~13h | ~46h**

**CORE (0–4): ~66h with Claude | ~235h without → ~3.6x, ~72% saved (~1.5–2 wks vs ~6 wks).**

**Sequence:** 0 → 1 → 2 → DEMO → 3 → 4. No feature work until Phase 0 lands.

---

## 7. Open Decisions (blocking)

1. **Tenancy:** single-tenant (your agency only) [recommended] vs multi-tenant SaaS.
2. **Sequencing:** foundation-first (Phase 0 gate) [recommended] vs feature-first (clients now, refactor later).
3. **Client portal:** in-scope v1 vs deferred to Phase 5.

---

## 8. Reuse Inventory (don't rebuild)

Auth (signup/verify/reset/invite) · billing periods+rates+payment tracking+PDF · time tracking · tickets (kanban+list) · dashboard + activity feed · role-access hooks · admin panels · `@workspace/ui` · `company-users` screen pattern (template for client CRUD).

---

## 9. REVISION 2 — Deep-scan corrections + persona model (2026-06-07)

After the user challenged scan thoroughness, key files were read DIRECTLY (schema.ts, role-system.md, BILLING_SYSTEM.md, FEATURES.md, DEVELOPMENT_STATUS.md, useRoleAccess.ts). Findings:

### 9.1 Docs are NOT trustworthy — code is ground truth
- `DEVELOPMENT_STATUS.md`: "~25% complete, Next.js 14, Core Features 0%" — STALE/WRONG (app is fully featured on Next 16).
- `FEATURES.md`: lists aspirational features (client portal, MFA, tax) as if built; says "Next.js 15".
- Treat all `docs/*.md` as historical; verify against source before relying on any claim.

### 9.2 Corrections to Rev 1 claims
| Rev 1 claim | Verified reality |
|---|---|
| Build a rate resolver (new) | EXISTS — `calculateApplicableRate()` (project>user>company default>user.hourly_rate). Extend, don't build. |
| Decide single vs multi-tenant | Already multi-tenant (company_id + RLS). Non-issue. |
| Inbound billing partially exists | OVERSTATED. "User-specific period" is a naming convention (company period filtered by user). No approval state machine. Inbound is structurally net-new. |

### 9.3 New defects found
- DEAD NAV: sidebar links `/diagnostics` but no `app/diagnostics/page.tsx` exists (broken link). `diagnostics.tsx` + `auth-diagnostic.tsx` orphaned.
- MIGRATION HYGIENE: numbering jumps 0012→0015 (0013/0014 missing); loose un-numbered SQL (`rls_policies.sql`, `add_payment_status_fixed.sql`, `enhanced-rls-policies.sql`). Reconcile before new migrations.
- Confirmed 14 tables in schema.ts; no client/user_type/deliverable/persona concepts.

### 9.4 PERSONA MODEL (new requirement: "admin view + act as client or freelancer")
Owner (super_admin) gets an `active_perspective` switcher → 3 scoped lenses:
- ADMIN (operate): all clients/projects/people, in+out billing, approve bills, margins.
- CLIENT (act as): 1-client scope — projects, deliverables, expectations, schedule, OUTBOUND invoices.
- FREELANCER (act as): 1-person scope — pending tasks, log time, submit bill (INBOUND), what I'm owed.

Two distinct builds (sequence matters):
1. PERSPECTIVE SWITCH (owner preview) = UI state + query scoping. Cheaper. MVP.
2. REAL EXTERNAL USERS (clients/freelancers log in, restricted) = `user_type` + RLS hardening + tests. Kai-gated. Deferred phase.

Same invoice object viewed from two perspectives = the two-sided billing UX (no duplicate data).

### 9.5 Roadmap delta
- Insert **Phase 1.5 — Perspective switcher (owner preview)** after clients land: `active_perspective` state + switcher UI + 3 scoped dashboards (heavy reuse). ~8–10h with Claude | ~30h without.
- Real external-user logins + RLS hardening = part of Phase 3/late (Kai-gated), NOT MVP.
- All else from §6 stands; Phase 0 (split service.ts + tests) remains the hard gate.

### 9.6 DECISION (locked 2026-06-07): Owner preview only for v1
- v1: ONLY the owner (super_admin) switches perspectives (Admin/Client/Freelancer) to view & test.
- NO external client/freelancer logins in v1 → NO `user_type` enforcement, NO RLS hardening needed yet.
- Perspective switching = UI state + query scoping (low risk). Real external logins + RLS = DEFERRED Phase 6 (Kai-gated).

### 9.7 LOCKED roadmap (owner-preview-only)
| Phase | Scope | With Claude | Without |
|---|---|---|---|
| 0 — Foundation (HARD GATE) | split service.ts · test harness · Drizzle types · delete dead code (diagnostics/auth-diagnostic + broken /diagnostics nav) · reconcile migrations (0013/0014 gap + loose SQL) · CI + Sentry + .nvmrc | ~15h | ~51h |
| 1 — Clients | clients + client_contacts · projects.client_id · CRUD (clone company-users) | ~10h | ~34h |
| 1.5 — Perspective switcher (owner preview) | active_perspective state + top-bar switcher + 3 scoped dashboards (heavy reuse) | ~9h | ~30h |
| 2 — Freelancer-per-project | extend project_members (rate/contract/is_contractor) · pending-tasks-per-person view · add user_type (data only, no enforcement) | ~9h | ~30h |
| 3 — Two-sided billing | employee_invoices (inbound) + approval state machine · refactor billing_periods→client_invoices (outbound) + line items + data migration · extend existing rate resolver + time routing · dual-direction PDF | ~20h | ~78h |
| 4 — Expectations & schedules | deliverables/milestones · client expectations · timeline view | ~8h | ~28h |
| **6 — DEFERRED (not v1)** | real external logins: user_type enforcement + RLS hardening + security test suite (Kai-gated) · optional client portal | — | — |

CORE v1 (0,1,1.5,2,3,4): **~71h with Claude | ~251h without → ~3.5x, ~72% saved** (~2 wks vs ~6.3 wks).
SEQUENCE: 0 → 1 → 1.5 → DEMO → 2 → 3 → 4. Phase 0 is the hard gate; no feature work before it lands.

### 9.8 BROKEN/DEAD tracking features found (deep scan, 2026-06-07) — Phase 0 must repair
Schema drift: hand-written `schema.ts` + services drifted onto columns that were never created (confirmed vs `drizzle-schema.ts` + migrations).

| Feature | File | Status | Bug |
|---|---|---|---|
| Performance Metrics (per-person) | `performance-metrics-service.ts` | LIVE+BROKEN (rendered `app/dashboard/page.tsx:265`) | queries non-existent `time_entries.hours` (→`duration`), `.date` (→`start_time`), `.project_id`, `.company_id`, `tickets.creator_id` (→`reporter_id`) |
| Project Health (full) | `project-health-service.ts` | DEAD CODE (341 lines, unimported) | same non-existent time_entries cols + `status==='blocked'` (no such status → blockers always 0). Superseded by `-simple`. |
| Project Health (simple) | `project-health-service-simple.ts` | LIVE, drift risk | `.eq('company_id')` on `tickets` (no such column; should join via projects) |

Real `time_entries` cols: id, ticket_id, user_id, start_time, end_time, **duration**(decimal hrs), description, created_at. NO hours/date/project_id/company_id.
Real `projects` cols: NO start_date/end_date (those exist on billing_periods only) → `daysRemaining` always undefined.
Real ticket statuses: new|in_progress|review|done (NO blocked). Ticket author field = `reporter_id` (NO creator_id).

**Phase 0 ADDITIONS (folded in, ~+4h with Claude):**
- Repair `performance-metrics-service.ts` to real columns (duration/start_time, join ticket→project, reporter_id) + integration test.
- Delete dead `project-health-service.ts` (use -simple) OR repair+consolidate into one.
- Fix `-simple` tickets.company_id via projects join.
- These become the FIRST integration tests (highest ROI — they'd have caught this).

"Pending tasks per person" data exists (tickets.assignee_id + status≠done) but NO dedicated per-project per-freelancer task view → built in Phase 2.
