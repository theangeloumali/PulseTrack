# Client Heat Map + AI Agent — Design Spec

**Date:** 2026-06-07
**Owner:** ZKidz team (Marcus coordinating)
**Status:** Awaiting design approval → implementation plan → build (E2E + video + triple review per /goal)

---

## 1. Problem & goal

The company owner needs one screen that answers: **who do I prioritize, what's left to do for them, and what's left to deliver** — plus an **AI agent** to query and organize clients conversationally and take action. Built entirely on data we already have (clients, projects, tickets, time_entries, client_invoices, activities).

Locked decisions (from brainstorm):
- **Heat signals:** overdue/unpaid invoices · open & past-due tasks · staleness · upcoming deadlines · **client demand/engagement**.
- **Remaining-to-deliver:** tickets now (v1); dedicated Deliverables/Milestones table later.
- **AI agent:** advisor **+ actions** (create ticket / draft invoice / reassign) behind confirmation + audit. Claude via Vercel AI Gateway.
- **Visualization:** cards (default) **+ matrix toggle**.

---

## 2. Heat-score model (pure, unit-testable)

Per client, compute company-scoped signals, normalize 0–1, weight, sum → **score 0–100** + tier (hot ≥67 / warm 34–66 / cool <34) + **reason breakdown**.

| Signal | Source | Hotter when |
|---|---|---|
| `financialRisk` | client_invoices where status in (sent, overdue) & due_date passed; sum(total) | more $ overdue |
| `deliveryBacklog` | open tickets (status≠done, deleted_at null) on client projects; overdue (past due_date) weighted ×2 | more open/overdue tasks |
| `staleness` | days since last activity/time_entry on client projects | longer silence |
| `upcomingDeadlines` | tickets due in next 7 days | more imminent due dates |
| `demand` | client activity volume (tickets created + activities) last 14 days | higher interaction/asks |

```
computeClientHeat(signals, weights) -> { score, tier, reasons[], counts }
```
Pure function (no I/O) → exhaustively unit-tested (no-data, all-overdue, all-healthy, single-signal). Default weights balanced; tunable.

Service `getClientHeatmap(companyId)`: batched queries (NO N+1) → assemble per-client signals → call pure fn → return ranked array. Also `getClientWorkBreakdown(clientId)` → { toDo: openTickets[], toDeliver: (in_review/overdue)[], gaps }.

---

## 3. AI agent (Vercel AI SDK v6 + AI Gateway, tool-calling)

```
 Browser (useChat, streaming)
        │  POST /api/ai/client-agent  (withAuth, company from session)
        ▼
 streamText({ model: 'anthropic/claude-...', tools, system })
        │
        ├─ READ tools (company-scoped server-side):
        │    getClientHeatmap · getClientStatus(clientId) · listPriorityClients · searchClients
        └─ WRITE tools (human-in-the-loop confirm + audit -> activities):
             proposeCreateTicket · proposeDraftInvoice · proposeReassignTicket
```

Security (Kai, non-negotiable):
- `company_id` is injected from the authenticated session — the model NEVER supplies it (no cross-tenant access).
- `ANTHROPIC_API_KEY` server-only.
- WRITE tools return a **proposed action**; the UI shows a confirm gate; only on confirm does the server execute + log to `activities` (audit). No silent mutations.
- System prompt scopes the agent to this company's client operations.

---

## 4. UI (cards default + matrix toggle + chat)

```
 /clients/heatmap
 ┌───────────────────────────────────────────────┬──────────────────┐
 │ Heat Map        [Cards | Matrix]   [Ask AI ▸]  │  AI ASSISTANT     │
 │ ─────────────────────────────────────────────│  (slide-over)     │
 │ CARDS (default, ranked by score):             │  > who do I       │
 │  ┌───────────┐ ┌───────────┐ ┌───────────┐    │    prioritize?    │
 │  │ Acme  🔴87│ │Umbrella🟠54│ │Initech 🟢21│    │  • Acme (overdue  │
 │  │ overdue $ │ │ 3 due soon │ │ healthy   │    │    invoice + 4    │
 │  │ 4 open    │ │ ...        │ │           │    │    open tasks)    │
 │  └───────────┘ └───────────┘ └───────────┘    │  [create ticket?] │
 │ MATRIX toggle: x=client value, y=attention,   │   → confirm gate  │
 │   bubble size = open work                     │                   │
 │ Drill-down: To do | To deliver | Gaps         │                   │
 └───────────────────────────────────────────────┴──────────────────┘
```
- Cards: color red/amber/green, score, top reason, counts (open tasks, overdue invoices), last-activity. Sort/filter.
- Matrix: scatter/bubble (value × attention, size = open work).
- Drill-down: "To do" (open tickets) · "To deliver" (in_review/overdue) · gaps/opportunities · "Ask AI about this client".
- Chat: AI SDK `useChat` streaming; renders tool calls + write-action confirmation prompts.
- Reuse @workspace/ui + existing card/badge/table patterns. Nav entry under Clients.

---

## 5. Data

- v1 heat map: NO new tables (derive from existing). AI audit → `activities` (new type `ai_action`).
- Phase 5 (later): `deliverables`/`milestones` table (the chosen "later").

---

## 6. Testing / video / review (the /goal)

- **Unit:** `computeClientHeat` (scoring + edge cases).
- **Integration:** `getClientHeatmap` shape + tenant-scoping; AI route auth + company injection; write-tool confirm gate.
- **E2E (Playwright + cursor video → MP4):** owner opens heat map → ranked clients → toggle matrix → drill a hot client → open AI chat → "who to prioritize?" (agent uses tools) → "create a ticket for Acme" → confirm gate → confirmed → ticket exists.
- **Triple code review:** Marcus (arch) + Maya (quality) + Kai (security — AI tenant-scoping + write gates).

---

## 7. Phasing & estimate (with Claude | without)

| Phase | Scope | with | without |
|---|---|---|---|
| 1 | heat-score service + API + cards/matrix UI + drill-down | 9h | 32h |
| 2 | AI agent READ tools + chat panel (AI SDK + Gateway) | 8h | 28h |
| 3 | AI WRITE tools + confirmation + audit | 6h | 22h |
| 4 | E2E + cursor video + triple review | 5h | 18h |
| 5 (later) | deliverables/milestones table | 6h | 20h |

Core (1–4): **~28h with Claude vs ~100h without (~3.5x)**.

---

## 8. Build approach

team-driven-development / ultracode workflow: Phase 1 (Ravi service + pure fn + Lena/Priya cards+matrix) → Phase 2 (AI route + tools + chat) → Phase 3 (write tools + confirm) → Phase 4 (Maya E2E + Rio video + triple review). Reuse-first; clean-code-typescript; no `any`.
