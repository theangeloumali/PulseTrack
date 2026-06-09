# PulseTrack — User Access Matrix & Demo Seed Manifest

**Date:** 2026-06-07
**Author:** Documentation pass (grounded in `apps/web/lib/hooks/useRoleAccess.ts` + `docs/role-system.md` + live DB schema)
**Scope:** Canonical user-access reference, demo account roster, deterministic seed inventory, and a 3–5 min demo script.

> **Schema truth:** Everything below is grounded in the CONFIRMED LIVE SCHEMA. Where the demo narrative needs tables that do **not** yet exist in the DB (`clients`, `client_contacts`, `projects.client_id`), they are flagged **PLANNED — not in live DB** so nobody seeds against a missing table.

---

## 1. Full User Access Matrix

Role hierarchy (each role inherits everything below it):

```
super_admin  →  system_admin  →  company_admin  →  manager  →  user
```

Permission predicates come straight from `useRoleAccess.ts`. Note the key nuance: **`canAccessCompany`, `canAccessDiagnostics`, `canManageUsers`, `canCreateProjects` ALL resolve to `[super_admin, system_admin, company_admin, manager]`** — i.e. managers get the same feature toggles as company admins in the current code. The only genuinely super-admin-gated surfaces are the `/admin/*` pages (All Companies, User Management) and cross-company data scope.

### 1.1 Page access by role

| Page / Route                         | super_admin | system_admin | company_admin | manager | user | Gate source                          |
| ------------------------------------ | :---------: | :----------: | :-----------: | :-----: | :--: | ------------------------------------ |
| Dashboard `/dashboard`               |     ✅      |      ✅      |      ✅       |   ✅    |  ✅  | nav: all roles                       |
| Projects `/projects`                 |     ✅      |      ✅      |      ✅       |   ✅    |  ✅  | nav: all roles                       |
| Tickets `/tickets`                   |     ✅      |      ✅      |      ✅       |   ✅    |  ✅  | nav: all roles                       |
| Time Tracking `/time-tracking`       |     ✅      |      ✅      |      ✅       |   ✅    |  ✅  | nav: all roles                       |
| Billing `/billing`                   |     ✅      |      ✅      |      ✅       |   ✅    |  ✅  | nav: all roles (user = self/own)     |
| Activity `/activity`                 |     ✅      |      ✅      |      ✅       |   ✅    |  ✅  | nav: all roles                       |
| Company `/company/users`             |     ✅      |      ✅      |      ✅       |   ✅    |  ❌  | `canAccessCompany`                   |
| Settings `/settings`                 |     ✅      |      ✅      |      ✅       |   ✅    |  ❌  | nav roles (no `user`)                |
| Diagnostics `/diagnostics`           |     ✅      |      ✅      |      ✅       |   ✅    |  ❌  | `canAccessDiagnostics`               |
| All Companies `/admin/companies`     |     ✅      |      ❌      |      ❌       |   ❌    |  ❌  | nav: `["super_admin"]`               |
| User Management `/admin/users`       |     ✅      |      ❌      |      ❌       |   ❌    |  ❌  | nav: `["super_admin"]`               |

### 1.2 Data scope & key permissions

| Capability                          | super_admin           | system_admin     | company_admin    | manager          | user             |
| ----------------------------------- | --------------------- | ---------------- | ---------------- | ---------------- | ---------------- |
| **Data scope**                      | Cross-company (ALL)   | Single-company   | Single-company   | Single-company   | Self / assigned  |
| Manage users (`canManageUsers`)     | ✅ all companies      | ✅ own company   | ✅ own company   | ✅ own company   | ❌               |
| Create projects (`canCreateProjects`)| ✅                   | ✅               | ✅               | ✅               | ❌               |
| Billing access                      | ✅ all companies      | ✅ own company   | ✅ own company   | ✅ own company   | ✅ own/self only |
| Company panel / settings            | ✅                    | ✅               | ✅               | ✅               | ❌               |
| Diagnostics                         | ✅                    | ✅               | ✅               | ✅               | ❌               |
| Admin panels (`/admin/*`)           | ✅                    | ❌               | ❌               | ❌               | ❌               |
| Delete time entry (own, unbilled)   | ✅                    | ✅               | ✅               | ✅               | ✅ (own only)    |
| Delete others' time entry (company) | ✅                    | ✅ same company  | ✅ same company  | ✅ same company  | ❌               |
| Delete time entry in **paid** period| ✅ (only role)        | ❌               | ❌               | ❌               | ❌               |

`canDeleteTimeEntry` logic (from the hook): super_admin can delete anything including paid periods; system/company admin + manager can delete within their own `company_id` for non-paid periods; a regular `user` can delete only their own unbilled entries; **paid billing period = super_admin only**.

### 1.3 FUTURE owner-preview personas (NOT yet enforced)

These are product/demo concepts only — there is **no code path, no role enum value, and no enforcement** for them today. Listed so the demo narrative is honest about what is real vs. roadmap.

| Persona (future) | Intended scope                                   | Maps loosely to | Status                                   |
| ---------------- | ------------------------------------------------ | --------------- | ---------------------------------------- |
| **Admin** preview| Company owner managing clients/projects/billing  | company_admin   | ⚠️ Not enforced — UI preview concept only |
| **Client** preview| External client sees only their own projects     | (none)          | ⚠️ Not enforced — no client portal exists |
| **Freelancer** preview| Contractor sees only assigned tickets/time  | user            | ⚠️ Not enforced — same as `user` today    |

---

## 2. Demo Account Roster

**Password for ALL accounts:** `DemoPass!2026` — created with `email_confirm: true`.

### Company: ZKidz Studio (`zkidz-studio`)

| # | Email                        | Role          | Persona                | What they demo                                                            |
| - | ---------------------------- | ------------- | ---------------------- | ------------------------------------------------------------------------ |
| 1 | superadmin@pulsetrack.demo   | super_admin   | Platform owner         | Cross-company view, `/admin/companies`, `/admin/users`, sees Globex too  |
| 2 | sysadmin@pulsetrack.demo     | system_admin  | Technical admin        | Company-wide ops, diagnostics, billing — single company                  |
| 3 | admin@pulsetrack.demo        | company_admin | **Company owner** (★)  | Primary demo login: clients, projects, billing, user management          |
| 4 | manager@pulsetrack.demo      | manager       | Account manager / lead | Project & ticket management, owns Initech client, team oversight         |
| 5 | dev1@pulsetrack.demo         | user          | Freelancer (dev)       | Assigned tickets, own time tracking, own billing                         |
| 6 | dev2@pulsetrack.demo         | user          | Freelancer (dev)       | Assigned tickets, own time tracking                                      |
| 7 | designer@pulsetrack.demo     | user          | Freelancer (designer)  | Assigned tickets, own time tracking                                      |

★ = recommended primary login for the walkthrough.

### Company: Globex Co. (`globex-co`) — multi-tenant proof

| # | Email                     | Role          | Persona       | What they demo                                              |
| - | ------------------------- | ------------- | ------------- | ---------------------------------------------------------- |
| 8 | admin2@pulsetrack.demo    | company_admin | Globex owner  | Proves company isolation — cannot see ZKidz Studio data    |
| 9 | user2@pulsetrack.demo     | user          | Globex member | Globex-scoped tickets/time only                            |

> **Christian Inc. (`christian-inc`) stays untouched** — it is existing real data and must not be seeded or torn down.

---

## 3. Seed Manifest

**Seed tag (mandatory on every row for clean teardown):**
- `activities.metadata.seed = 'demo-2026'`
- text-bearing rows (`notes`, `description`) get suffix `[demo-seed]`
- demo emails all match `@pulsetrack.demo`, demo companies match slugs `zkidz-studio` / `globex-co`

**Teardown:** delete where the tag matches — `activities WHERE metadata->>'seed'='demo-2026'`; `users WHERE email LIKE '%@pulsetrack.demo'`; `companies WHERE slug IN ('zkidz-studio','globex-co')`; cascade child rows (tickets→time_entries→time_entry_billing, billing_periods, etc.) by FK before parents. Never touch `christian-inc` or non-`@pulsetrack.demo` users.

### 3.1 Inventory by table

| Table                  | Count (approx) | Notes                                                                                                   |
| ---------------------- | -------------- | ------------------------------------------------------------------------------------------------------- |
| `companies`            | 2              | ZKidz Studio, Globex Co. (Christian Inc. untouched)                                                     |
| `users`                | 9              | 7 ZKidz Studio + 2 Globex; `status='active'`, `company_id` NOT NULL, `hourly_rate` set for freelancers  |
| `clients` ⚠️ PLANNED   | 3              | Acme Corp, Initech, Umbrella LLC — **table does not exist in live DB; create migration first**          |
| `client_contacts` ⚠️ PLANNED | 5        | Acme: Jane Doe (PM, primary)+John Roe (Finance); Initech: Bill Lumbergh (Director, primary); Umbrella: Alice Wesker (CTO, primary)+Ada Wong (Ops) |
| `projects`             | 5              | Acme Website Revamp, Acme Mobile App, Initech TPS Portal, Umbrella Dashboard, Umbrella API. `client_id` ⚠️ PLANNED column |
| `project_members`      | ~12            | 2–3 freelancers (dev1/dev2/designer) per project, role `lead`/`member`; unique(project_id,user_id)      |
| `tickets`              | ~40 (≈8/project)| Spread across ALL 4 statuses `new`/`in_progress`/`review`/`done`; priority mix; assignee_id + reporter_id (NOT NULL) + due_date + sort_order + estimated/actual_hours |
| `time_entries`         | ~60            | Last 14 days, `start_time`/`end_time` set, `duration` decimal hours; `ticket_id`+`user_id` NOT NULL     |
| `billing_rates`        | ~6             | Per user×project hourly_rate, currency, effective_from                                                  |
| `billing_periods`      | ~6 (3/company-ish)| Cover payment_status values: `pending`, `sent`, `paid`, `overdue`; status `draft`/`active`/`closed`  |
| `time_entry_billing`   | ~50            | One per billable time_entry → billing_period, with hourly_rate, billable_amount, is_billable            |
| `payment_history`      | ~8             | Action rows on billing_periods (status transitions) for an audit-trail demo                              |
| `company_billing_settings` | 2          | One per demo company (currency, invoice_prefix, brand colors)                                            |
| `activities`           | ~30            | type/project_id/ticket_id/user_id, `metadata.seed='demo-2026'`; drives dashboard recent-activity feed   |

### 3.2 Client → contacts → projects map (ZKidz Studio)

| Client       | Account owner            | Contacts (persons-in-charge)                | Projects                              |
| ------------ | ------------------------ | ------------------------------------------- | ------------------------------------- |
| Acme Corp    | admin@pulsetrack.demo    | Jane Doe (PM, **primary**), John Roe (Finance) | Acme Website Revamp, Acme Mobile App |
| Initech      | manager@pulsetrack.demo  | Bill Lumbergh (Director, **primary**)       | Initech TPS Portal                    |
| Umbrella LLC | admin@pulsetrack.demo    | Alice Wesker (CTO, **primary**), Ada Wong (Ops) | Umbrella Dashboard, Umbrella API   |

### 3.3 Demo narrative

ZKidz Studio is a dev agency. The company owner (`admin@`) manages 3 clients, each with named persons-in-charge and one or more active projects. Freelancers (`dev1`, `dev2`, `designer`) are assigned to project boards, log time over the last two weeks (so dashboards and reports show live activity), and that time rolls up into billing periods at various payment stages — one already `paid`, one `sent`/awaiting, one `overdue`, one `draft` — proving the full invoice lifecycle. Globex Co. exists solely to prove tenant isolation: its admin sees none of ZKidz's data, while the platform super_admin sees both.

> **Prerequisite for client portion:** `clients` + `client_contacts` tables and `projects.client_id` are **not in the live DB**. Generate and run a Drizzle migration (`cd apps/web && pnpm migration:generate`) before seeding the client/contact rows; until then, seed only the 5 projects without `client_id` and treat the client→contact layer as a roadmap demo.

---

## 4. Demo Script (3–5 minutes)

```
┌──────────────────────────────────────────────────────────────────────┐
│  PULSETRACK DEMO WALKTHROUGH — ~4 min                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [0:00] LOGIN as company owner                                         │
│    admin@pulsetrack.demo / DemoPass!2026                               │
│       → lands on Dashboard, recent activity feed populated             │
│                          │                                             │
│                          ▼                                             │
│  [0:30] CLIENTS LIST  (★ requires planned clients table)              │
│    Show 3 clients: Acme Corp · Initech · Umbrella LLC                  │
│                          │                                             │
│                          ▼                                             │
│  [1:00] CLIENT DETAIL → Acme Corp                                      │
│    Persons-in-charge: Jane Doe (PM, primary), John Roe (Finance)       │
│    Projects under client: Acme Website Revamp, Acme Mobile App         │
│                          │                                             │
│                          ▼                                             │
│  [1:45] PROJECT BOARD → Acme Website Revamp                           │
│    Kanban: new / in_progress / review / done                          │
│    Tickets with assignees, due dates, priorities                      │
│                          │                                             │
│                          ▼                                             │
│  [2:30] TIME TRACKING                                                  │
│    Last-14-day entries (decimal hours) per freelancer                 │
│                          │                                             │
│                          ▼                                             │
│  [3:00] BILLING                                                        │
│    Billing periods across payment_status:                             │
│    paid ✅ · sent ⏳ · overdue 🚨 · draft 📝                          │
│    Payment history audit trail                                        │
│                          │                                             │
│                          ▼                                             │
│  [3:45] SWITCH USER → super_admin@pulsetrack.demo                     │
│    /admin/companies → sees ZKidz Studio AND Globex Co.               │
│    Proves cross-company scope + tenant isolation                      │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

**Talking points per stop:**
1. **Login (owner)** — Dashboard shows seeded recent activity; emphasize single-company scope.
2. **Clients list** — agency-style overview of who you work for (roadmap surface if migration not yet run).
3. **Client detail** — persons-in-charge + projects, the client-management value prop.
4. **Project board** — drag tickets across all 4 statuses; assignees + due dates are real seed data.
5. **Time tracking** — two weeks of decimal-hour entries; ties work to people.
6. **Billing** — invoice lifecycle across `paid`/`sent`/`overdue`/`draft` with `payment_history` trail.
7. **Super admin** — log out, log in as `superadmin@`, open `/admin/companies` to show both tenants and confirm Globex data is isolated from ZKidz.
```
