# PulseTrack `service.ts` Split — Domain Files + Squad Ownership Map

**Date:** 2026-06-07
**Source:** `apps/web/lib/db/service.ts` (2,282 lines, 76 exported functions + 1 private helper)
**Goal:** Carve the monolith into 8 domain service files so Wave-1 squads (ALPHA/BRAVO/CHARLIE/DELTA/ECHO) can edit in parallel with zero file collisions.

---

## 1. Shared imports today (top of `service.ts`)

Every new file inherits some subset of these. The first three are read by **all** files and must be FROZEN during the split.

| Import | Source | Notes |
| --- | --- | --- |
| `supabase` | `@/lib/db` (index.ts) | client singleton — every file imports it. FROZEN. |
| 12 field selectors | `./queries` | `userBasicFields`, `userWithCompanyFields`, `companyBasicFields`, `projectBasicFields`, `projectWithRelationsFields`, `ticketWithUsersFields`, `ticketWithProjectFields`, `ticketFullFields`, `timeEntryWithUserFields`, `timeEntryWithTicketFields` — split per-file (see §2). `ticketBasicFields` + `commentWithUserFields` are **imported but UNUSED** → drop during split. |
| schema types | `@/lib/db/schema` | `NewCompany`, `NewUser`, `NewProject`, `NewProjectMember`, `NewTicket`, `NewTimeEntry`, `NewActivity`, `NewTicketHistory`, `ActivityWithUser`, `UserWithCompany`. FROZEN. |
| `getApiPath` | `@/lib/utils` | only `inviteUserToCompany` uses it → users-service. |
| `createOrUpdateTimeEntryBilling` | `./billing-service` | only time-entries uses it. |
| `retryOperation` (private, L105) | local helper | only caller is `createCompanyAndUser` → moves into companies-service. Not exported; if a 2nd caller ever appears, extract to a shared `db/retry.ts`. |

---

## 2. Domain files — exact function moves (with current line numbers)

### `companies-service.ts` (4 fns + private helper)
- `getCompanyById` — L33
- `getCompanyBySlug` — L40
- `createCompany` — L47
- `createCompanyAndUser` — L143
- `retryOperation` (private, L105) — moves here (sole consumer)

Selectors: none. **Cross-file imports needed:** `getUserWithCompany` from users-service (L214 call).

### `users-service.ts` (17 fns)
- `getUserById` — L55
- `getUserWithCompany` — L62
- `getUsersByCompany` — L86
- `createUser` — L97
- `getUsersInCompany` — L1018
- `getCompanyUsers` — L1384
- `updateUserRole` — L1419
- `updateUserStatus` — L1437
- `updateUserHourlyRate` — L1452
- `removeUserFromCompany` — L1467
- `getAssignableUsers` — L1485
- `inviteUserToCompany` — L1509
- `updateUser` — L1542
- `archiveUser` — L1557
- `restoreUser` — L1570
- `deleteUser` — L1583
- `getArchivedUsers` — L1596

Selectors: `userBasicFields`, `userWithCompanyFields`. Other imports: `getApiPath`. **Cross-file:** self-contained (no sibling-service calls).

### `projects-service.ts` (8 fns)
- `getProjectById` — L237
- `getProjectsByCompany` — L244
- `createProject` — L257
- `updateProject` — L281
- `deleteProject` — L306
- `getProjectsWithTicketCounts` — L1030
- `getAccessibleProjectsByCompany` — L1066
- `getAccessibleProjectsWithTicketCounts` — L1112

Selectors: `projectWithRelationsFields`, `projectBasicFields`, `companyBasicFields`, `userBasicFields`. **Cross-file imports needed:** `addProjectMember` from project-access-service (L266); `logProjectCreated`, `logProjectUpdated` from activities-service (L273, L297).

### `project-access-service.ts` (6 fns)
- `addProjectMember` — L313
- `removeProjectMember` — L346
- `getProjectMembers` — L372
- `getUserProjects` — L399
- `updateProjectMemberRole` — L415
- `canUserManageProjectMembers` — L1174

Selectors: `userBasicFields`, `projectBasicFields`. **Cross-file imports needed:** `getProjectById` from projects-service (L334, L362); `logUserAddedToProject`, `logUserRemovedFromProject` from activities-service (L336, L364).

### `tickets-service.ts` (13 fns)
- `getTicketById` — L433
- `getTicketByIdWithCompanyAccess` — L446  *(security-critical)*
- `getTicketsByProject` — L459
- `getTicketsByProjectWithCompanyAccess` — L473  *(security-critical)*
- `getTicketsByCompany` — L498
- `getAccessibleTicketsByCompany` — L516  *(security-critical)*
- `createTicket` — L559
- `updateTicket` — L574
- `updateTicketSortOrders` — L644
- `deleteTicket` — L676
- `getTicketCountByProject` — L690
- `getRecentTicketsByProject` — L702
- `getRecentTicketsByProjectWithCompanyAccess` — L717  *(security-critical)*

Selectors: `ticketFullFields`, `ticketWithUsersFields`, `ticketWithProjectFields`. **Cross-file imports needed:** `logTicketCreated`, `logTicketUpdated`, `logTicketAssigned` from activities-service (L566, L590, L594); `logTicketFieldChange` from ticket-history-service (L630).

### `time-entries-service.ts` (12 fns)
- `getTimeEntriesByTicket` — L745
- `getTimeEntriesByUser` — L756
- `createTimeEntry` — L773
- `updateTimeEntry` — L820
- `deleteTimeEntry` — L856  *(security-critical: auth + role checks)*
- `getActiveTimeEntry` — L966
- `getTotalTimeByTicket` — L978
- `getTotalTimeByUser` — L991
- `getTimeEntriesForBilling` — L1247  *(billing data-correctness)*
- `getTimeEntriesForBillingByUser` — L1310  *(billing data-correctness)*
- `checkTimeEntryIntegrity` — L2072
- `cleanupOrphanedTimeEntries` — L2220

Selectors: `timeEntryWithUserFields`, `timeEntryWithTicketFields`. **Cross-file imports needed:** `createOrUpdateTimeEntryBilling` from billing-service (L806, L845); `logTimeEntryCreated` from activities-service (L795). Uses `supabase.auth.getUser()` (L858).

### `activities-service.ts` (13 fns)
- `createActivity` — L1616
- `getProjectActivities` — L1626
- `getUserActivities` — L1677
- `getRecentActivitiesForUser` — L1729
- `getCompanyActivities` — L1794
- `logProjectCreated` — L1850
- `logProjectUpdated` — L1864
- `logTicketCreated` — L1883
- `logTicketUpdated` — L1903
- `logTicketAssigned` — L1924
- `logUserAddedToProject` — L1946
- `logUserRemovedFromProject` — L1967
- `logTimeEntryCreated` — L1987

Selectors: none (inline `select(...)` strings). **Cross-file:** self-contained. All `log*` helpers call local `createActivity`. **This file is the most-imported sibling** — projects, project-access, tickets, time-entries all import its `log*` helpers.

### `ticket-history-service.ts` (3 fns)
- `createTicketHistory` — L2013
- `getTicketHistory` — L2027
- `logTicketFieldChange` — L2046

Selectors: none. **Cross-file:** self-contained. `logTicketFieldChange` calls local `createTicketHistory`; imported by tickets-service.

---

## 3. Post-split import graph (collision-relevant)

```
                  +------------------------+
                  |  activities-service    |  (BRAVO)  <-- imported by 4 squads
                  +------------------------+
                     ^      ^      ^      ^
        logProject*  |      |      |      | logTimeEntryCreated
        logUser*ToPrj|      |      |      |
        +------------+      |      |      +-----------------+
        |                   |      |                        |
+----------------+   +-------------+   +----------------+   +-------------------+
| projects-svc   |<->| project-     |   | tickets-svc    |   | time-entries-svc  |
| (CHARLIE)      |   | access-svc   |   | (CHARLIE)      |   | (DELTA)           |
+----------------+   | (ALPHA)      |   +----------------+   +-------------------+
   |   ^  ^          +-------------+         |                      |
   |   |  |   createProject->addProjectMember|                     |
   |   |  +----------------------------------+                     |
   |   |      addProjectMember->getProjectById  <== CIRCULAR       |
   |   |                                          |                |
   |   |                          logTicketFieldChange             | createOrUpdate
   |   |                                  v                        v   TimeEntryBilling
   |   |                       +----------------------+   +-----------------+
   |   |                       | ticket-history-svc   |   | billing-service |
   |   |                       | (BRAVO)              |   | (DELTA)         |
   |   |                       +----------------------+   +-----------------+
   |   |
   |   +-- companies-svc (ECHO) --imports--> getUserWithCompany (users-svc, ECHO)
   |
 FROZEN (read-only, lead-owned): queries.ts, schema.ts, db/index.ts, lib/utils.ts
```

---

## 4. SQUAD FILE-OWNERSHIP TABLE

Each file has **exactly one** write-owner squad. FROZEN files are read-only for all squads (write-owner = Marcus/lead, no Wave-1 edits).

| File | Write-Owner Squad | Rationale |
| --- | --- | --- |
| `companies-service.ts` | **ECHO** (client-mgmt) | companies = client tenants |
| `users-service.ts` | **ECHO** (client-mgmt) | user CRUD / invite / archive |
| `projects-service.ts` | **CHARLIE** (frontend/page-load) | project lists + ticket-count feeds power dashboards |
| `project-access-service.ts` | **ALPHA** (security) | membership = the authorization basis; `canUserManageProjectMembers` |
| `tickets-service.ts` | **CHARLIE** (frontend/page-load) | kanban board page-load is the dominant consumer |
| `time-entries-service.ts` | **DELTA** (backend-scale) | billing aggregation, heavy joins, integrity/cleanup batch ops |
| `activities-service.ts` | **BRAVO** (data-correctness) | audit-trail write integrity |
| `ticket-history-service.ts` | **BRAVO** (data-correctness) | field-change audit trail |
| `billing-service.ts` (existing) | **DELTA** (backend-scale) | billing pipeline; only time-entries depends on it |
| `queries.ts` (existing) | **FROZEN** (lead) | selectors read by all 8 files — any edit blocks everyone |
| `schema.ts` (existing) | **FROZEN** (lead) | shared types read by all |
| `lib/db/index.ts` (existing) | **FROZEN** (lead) | `supabase` client singleton |
| `lib/utils.ts` (existing) | **FROZEN** (lead) | `getApiPath`; touch only outside Wave 1 |
| `service.ts` (existing) | **FROZEN** (lead) | becomes a barrel re-export of the 8 new files after the split; lead owns the cutover so all call sites keep resolving |

No file appears under two squads. ✅

---

## 5. Cross-squad collisions — MUST resolve before parallel dispatch

These are functions/edges where one squad's file depends on another squad's file. They are **imports** (allowed) but the *contract* (signature) is shared, so a signature change requires coordination. The CIRCULAR one is a hard blocker.

| # | Collision | Squads involved | Resolution |
| --- | --- | --- | --- |
| **C1 🔴** | **Circular dep:** `createProject` → `addProjectMember` (projects→project-access) AND `addProjectMember`/`removeProjectMember` → `getProjectById` (project-access→projects) | CHARLIE ↔ ALPHA | **Break the cycle before split.** Option A: caller passes the loaded `project` object into `addProjectMember` (drop the internal `getProjectById` lookup at L334/L362). Option B: move `getProjectById` to a shared `projects-read` slice both import. **Pick A** (smaller, no new file). Owner: Marcus assigns at contract time. |
| C2 | Activity `log*` helpers consumed by projects, project-access, tickets, time-entries | BRAVO owns; CHARLIE+ALPHA+DELTA consume | BRAVO is sole write-owner of `activities-service.ts`. Signatures FROZEN for Wave 1; any change goes through BRAVO. Consumers import only. |
| C3 | `logTicketFieldChange` consumed by `updateTicket` | BRAVO owns; CHARLIE consumes | Import-only; BRAVO owns ticket-history signatures. |
| C4 | `getUserWithCompany` consumed by `createCompanyAndUser` | ECHO owns both | Same squad — no cross-squad issue. |
| C5 | `createOrUpdateTimeEntryBilling` consumed by time-entries | DELTA owns both billing-service + time-entries | Same squad — no cross-squad issue. |
| C6 | **Security functions inside CHARLIE/DELTA files:** `getTicketByIdWithCompanyAccess`, `getTicketsByProjectWithCompanyAccess`, `getAccessibleTicketsByCompany`, `getRecentTicketsByProjectWithCompanyAccess` (tickets, CHARLIE); `deleteTimeEntry` role/auth gate (time-entries, DELTA) | ALPHA review interest in CHARLIE/DELTA files | Files stay single-owner (CHARLIE/DELTA) to avoid collision, but these specific functions are flagged **ALPHA-review-required** in Wave 2. ALPHA does not write these files in Wave 1. |
| C7 | Billing-correctness functions `getTimeEntriesForBilling`/`...ByUser` inside DELTA file | BRAVO review interest | DELTA owns; **BRAVO-review-required** in Wave 2. |
| C8 | Dead imports `ticketBasicFields`, `commentWithUserFields` | FROZEN queries.ts | Drop the unused imports during split; do not add to any new file. |
| C9 | Private `retryOperation` | companies-service (ECHO) | Sole caller is `createCompanyAndUser`; move with it. Keep private. |

**Bottom line:** Only **C1 (circular)** must be code-resolved before Wave 1 can run fully parallel. C2/C3 are managed by single-write-ownership of `activities-service.ts` / `ticket-history-service.ts`. C6/C7 are review-routing flags, not write collisions.
