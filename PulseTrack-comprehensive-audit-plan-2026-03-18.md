# PulseTrack Comprehensive Audit & Upgrade Plan
**Date**: 2026-03-18
**Scope**: Library upgrades, performance, session/auth, security

---

## Context

PulseTrack is a production project management system deployed at pulsetrack.zkidzdev.com. This audit was triggered to proactively identify and fix issues across four domains before they impact users. The codebase is a Turbo monorepo with Next.js 16, React 19, Supabase, and TanStack Query.

---

## Executive Summary

| Domain | Health | Critical Issues | High Issues |
|--------|--------|----------------|-------------|
| **Dependencies** | A (Excellent) | 0 | 0 |
| **Performance** | C (Needs Work) | 2 | 4 |
| **Session/Auth** | D (Poor) | 2 | 4 |
| **Security** | D (Poor) | 4 | 5 |

**Total issues found: 8 Critical, 13 High, 8 Medium**

---

## Time Estimates Summary

| Phase | With Claude Code | Without Claude Code | Savings |
|-------|-----------------|--------------------:|--------:|
| Phase 1: Critical Security | 2h | 6h | 67% |
| Phase 2: Auth/Session | 3h | 10h | 70% |
| Phase 3: Performance | 3h | 12h | 75% |
| Phase 4: Security Hardening | 3h | 10h | 70% |
| Phase 5: Headers & Config | 1h | 3h | 67% |
| Phase 6: Verification | 1h | 3h | 67% |
| **TOTAL** | **13h** | **44h** | **70%** |

**Productivity multiplier: 3.4x faster with Claude Code**

---

## DEPENDENCY AUDIT RESULTS

All major dependencies are **current and up-to-date**:

| Package | Current | Latest | Status |
|---------|---------|--------|--------|
| Next.js | 16.1.6 | 16.1.6 | Current |
| React | 19.2.4 | 19.2.4 | Current |
| TypeScript | 5.9.3 | 5.9.3 | Current |
| TanStack Query | 5.90.21 | 5.90.21 | Current |
| Zustand | 5.0.11 | 5.0.11 | Current |
| Tailwind CSS | 4.2.0 | 4.2.0 | Current |
| Drizzle ORM | 0.45.1 | 0.45.1 | Current |
| Supabase JS | 2.97.0 | 2.97.0 | Current |
| Turbo | 2.8.10 | 2.8.10 | Current |
| Framer Motion | 12.34.3 | 12.34.3 | Current |
| Zod | 4.3.6 | 4.3.6 | Current |

**Minor config issue**: Root `eslint.config.js` uses CommonJS `module.exports` — should convert to ES modules for consistency. Low priority.

**No library upgrades needed. Focus shifts entirely to code-level fixes.**

---

## Phase 1: CRITICAL SECURITY FIXES (Immediate)
**Time: 2h with Claude | 6h without**

### 1.1 Remove Debug Endpoints
**Severity**: CRITICAL
**Files**:
- `apps/web/app/api/debug-env/route.ts` — DELETE entirely
- `apps/web/app/api/debug-billing/route.ts` — DELETE entirely

**Why**: These endpoints are accessible without authentication. `debug-billing` returns sensitive billing data (hourly rates, time entries, company settings) for ANY company ID passed as a query param. `debug-env` exposes infrastructure configuration.

### 1.2 Revoke Exposed API Keys
**Severity**: CRITICAL
**File**: `.env` (root)

**Issue**: Root `.env` contains active API keys (OpenAI `sk-proj-...`, GitHub, XAI, Azure, Ollama). If this file was ever committed to git, keys are compromised.

**Action**:
1. Revoke OpenAI key immediately at platform.openai.com
2. Rotate all other keys
3. Verify `.env` is in `.gitignore` (check both root and `apps/web/`)
4. Run `git log -p -- .env` to check if it was ever committed
5. If committed: use `git filter-branch` or BFG Repo Cleaner to purge history
6. Move all secrets to Vercel environment variables

### 1.3 Fix withAuth Wrapper — Use Service Role for Role Checks
**Severity**: CRITICAL
**File**: `apps/web/lib/auth-utils.ts` (lines 112-175)

**Issue**: `withAuth` uses the publishable anon key for server-side role validation. This means the role check goes through RLS, which if misconfigured, could allow privilege escalation.

**Fix**: Use `supabase.auth.getUser()` (which validates JWT server-side) and then use service role client ONLY for the role lookup query. Add timeout protection.

### 1.4 Fix Admin Endpoint Data Exposure
**Severity**: CRITICAL
**File**: `apps/web/app/api/admin/users/route.ts`

**Issue**: Returns ALL users across ALL companies (including hourly rates/salary data). Even with `withAuth(['super_admin'])`, defense-in-depth requires additional safeguards.

**Fix**: Add pagination, field filtering (exclude sensitive fields unless explicitly requested), and audit logging.

---

## Phase 2: AUTH & SESSION FIXES
**Time: 3h with Claude | 10h without**

### 2.1 Re-enable Session Manager with Safe Configuration
**Severity**: CRITICAL
**File**: `apps/web/lib/supabase/session-manager.ts` (lines 12-18)

**Issue**: Session refresh is COMPLETELY DISABLED (`console.log('SessionManager: Disabled...')`). No proactive token refresh exists. Sessions silently expire after TTL, causing 401 errors on next request.

**Fix**: Re-enable with conflict-safe implementation:
- Use `startPeriodicRefresh()` with 4-minute intervals (Supabase default session = 1hr)
- Coordinate with auth store to avoid double-refresh
- Add `setupVisibilityListener()` for tab-return refresh

### 2.2 Fix Module-Level Auth Listener Flag
**Severity**: CRITICAL
**File**: `apps/web/lib/stores/auth.ts` (lines 57-58, 582-649)

**Issue**: `authListenerRegistered` is a module-level boolean that never resets. Cannot re-register listener if store is recreated. Causes zombie listeners on logout/login cycles.

**Fix**: Move listener registration into the store lifecycle. Use a subscription cleanup pattern. Reset flag on signOut.

### 2.3 Add Auth Initialization Timeout
**Severity**: HIGH
**File**: `apps/web/lib/stores/auth.ts` (lines 428-663)

**Issue**: `initialize()` has no timeout. If `getUserWithCompany()` hangs, the entire app stays on loading screen forever.

**Fix**: Add 10-second timeout with graceful fallback to error state. Show user a "retry" button.

### 2.4 Fix Signup Race Condition
**Severity**: HIGH
**File**: `apps/web/lib/stores/auth.ts` (lines 195, 430-440)

**Issue**: If signup takes >60 seconds, `initialize()` clears `signupInProgress` flag and tries to fetch user, interrupting the signup flow.

**Fix**: Use a mutex/lock pattern. Don't clear signup state from `initialize()` — let the signup flow itself manage its lifecycle.

### 2.5 Reduce Stale Session Cache from 5min to 30sec
**Severity**: HIGH
**File**: `apps/web/lib/stores/auth.ts` (lines 665-714)

**Issue**: `recoverSession()` trusts cached session validity for 5 minutes. If session expires at T=3min, API calls fail silently until T=5min.

**Fix**: Reduce cache to 30 seconds. Add proactive refresh when session is within 5 minutes of expiry.

### 2.6 Add Auth Validation to Middleware for API Routes
**Severity**: HIGH
**File**: `apps/web/lib/supabase/middleware.ts` (lines 59-62)

**Issue**: Middleware skips ALL auth checks for API routes (`if (isApiRoute) return`). Each route must manually validate auth. If a route forgets, it's publicly accessible.

**Fix**: Add token validation in middleware for `/api/` routes (except `/api/auth/*` public endpoints). Return 401 for missing/invalid tokens before reaching route handlers.

### 2.7 Improve Logout Cleanup
**Severity**: MEDIUM
**File**: `apps/web/lib/stores/auth.ts` (lines 167-179)

**Fix**: On signOut, also:
- Clear TanStack Query cache (`queryClient.clear()`)
- Cancel pending requests
- Reset `authListenerRegistered` flag
- Clear any localStorage artifacts

---

## Phase 3: PERFORMANCE FIXES
**Time: 3h with Claude | 12h without**

### 3.1 Fix Query Invalidation Cascade
**Severity**: CRITICAL
**File**: `apps/web/lib/hooks/useTickets.ts` (lines 104-128)

**Issue**: Every ticket mutation invalidates 7+ query keys, triggering cascade re-fetches across the entire app.

**Fix**:
- Use targeted invalidation (only invalidate the specific list/detail that changed)
- Use `setQueryData` for optimistic updates instead of invalidation
- Remove redundant key invalidations (e.g., don't invalidate both `ticketKeys.list(projectId)` AND `ticketKeys.all + 'company'`)

### 3.2 Fix Double Refetch on Window Focus
**Severity**: CRITICAL
**Files**:
- `apps/web/components/query-provider.tsx` (lines 16-18)
- `apps/web/components/auto-refresh.tsx`

**Issue**: TanStack Query's `refetchOnWindowFocus: true` PLUS `auto-refresh.tsx` adding duplicate `visibilitychange` and `focus` listeners = every tab switch triggers ALL queries to refetch twice.

**Fix**:
- Remove `auto-refresh.tsx` entirely (TanStack Query handles this natively)
- Set `refetchOnWindowFocus: true` (keep), remove `refetchOnMount: true` (unnecessary with proper staleTime)
- Or keep auto-refresh but disable TanStack's built-in refetch

### 3.3 Deduplicate Overlapping Ticket Queries
**Severity**: HIGH
**File**: `apps/web/lib/hooks/useTickets.ts`

**Issue**: Three separate hooks fetch similar ticket data with different keys:
- `useProjectTicketsQuery()` → project-scoped tickets
- `useCompanyTicketsQuery()` → role-filtered company tickets
- `useAllCompanyTicketsQuery()` → all company tickets

**Fix**: Consolidate into a single query with filter parameters. Use `select` option in TanStack Query to derive filtered views from a single cache entry.

### 3.4 Fix Session Validation on Every Query
**Severity**: HIGH
**File**: `apps/web/lib/hooks/useSessionAwareQuery.ts` (lines 27-32)

**Issue**: Every query calls `ensureValidSessionForQuery()` which hits `supabase.auth.getSession()`. 10 parallel queries = 10 session checks.

**Fix**: Cache session validation result for 30 seconds. Use a shared promise to deduplicate concurrent calls.

### 3.5 Increase staleTime for Stable Data
**Severity**: MEDIUM
**Files**: All hooks in `apps/web/lib/hooks/`

**Issue**: staleTime is 2 minutes for all data, including stable data like projects and user profiles.

**Fix**:
- Tickets: 2 min (keep, frequently updated)
- Projects: 30 min (rarely change)
- Users/profiles: 30 min
- Company settings: 60 min
- Billing periods: 30 min

### 3.6 Add Suspense Boundaries
**Severity**: MEDIUM
**Files**: `apps/web/app/` layout and page files

**Fix**: Add `<Suspense>` boundaries around:
- Dashboard data sections
- Project health panels
- Billing data tables
- User lists

---

## Phase 4: SECURITY HARDENING
**Time: 3h with Claude | 10h without**

### 4.1 Add Zod Input Validation to All API Routes
**Severity**: HIGH
**Files**: All routes in `apps/web/app/api/`

**Issue**: Most routes use raw `searchParams.get()` without validation. No UUID format checks, no length limits, no logical validation.

**Key routes to fix**:
- `api/billing/report/route.ts` — companyId, dates, targetUserId
- `api/billing/payments/route.ts` — all params
- `api/admin/users/route.ts` — pagination params
- `api/invite-user/route.ts` — email, role, companyId

### 4.2 Add CSRF Protection
**Severity**: HIGH
**Files**: All state-changing endpoints (POST, PUT, DELETE)

**Issue**: No CSRF protection. DELETE operations use query params (could be triggered via `<img>` tags).

**Fix**: Verify `Origin` header against allowed origins. Move all state-changing operations to POST with JSON body.

### 4.3 Add Rate Limiting
**Severity**: HIGH
**Files**: All API routes

**Fix**: Add rate limiting using Vercel's built-in or Upstash Redis:
- Auth endpoints: 10 req/min
- Admin endpoints: 30 req/min
- Standard endpoints: 100 req/min

### 4.4 Add Audit Logging
**Severity**: MEDIUM
**New file**: `apps/web/lib/audit.ts`

**Fix**: Log sensitive operations:
- User CRUD (create, update role, delete)
- Company operations
- Billing modifications
- Payment history changes
- Role changes

### 4.5 Sanitize Error Logs
**Severity**: MEDIUM
**Files**: All API routes

**Fix**: Redact emails, UUIDs, and tokens from console.error output.

---

## Phase 5: SECURITY HEADERS & CONFIG
**Time: 1h with Claude | 3h without**

### 5.1 Add CSP Headers
**File**: `apps/web/next.config.mjs`

Add Content-Security-Policy, Strict-Transport-Security (HSTS), and Permissions-Policy headers.

### 5.2 Convert Root ESLint to ES Modules
**File**: `eslint.config.js` (root)

Minor: Convert `module.exports` to `export default` for consistency.

---

## Phase 6: VERIFICATION
**Time: 1h with Claude | 3h without**

### 6.1 Run Full Build & Typecheck
```bash
pnpm build && cd apps/web && pnpm typecheck
```

### 6.2 Manual Auth Flow Testing
- Signup flow end-to-end
- Login/logout cycle
- Session expiry and refresh
- Role-based access (each role level)

### 6.3 Security Spot Check
- Verify debug endpoints are gone (404)
- Verify API routes reject unauthenticated requests
- Verify rate limiting works
- Check CSP headers in browser DevTools

### 6.4 Performance Spot Check
- Open DevTools Network tab
- Switch tabs and verify only 1 refetch wave (not 2)
- Check that ticket mutations only invalidate targeted queries
- Verify staleTime differences between data types

---

## Execution Order & Dependencies

```
Phase 1 (Critical Security) ──── MUST BE FIRST
  ├── 1.1 Remove debug endpoints (no deps)
  ├── 1.2 Revoke API keys (no deps)
  ├── 1.3 Fix withAuth (no deps)
  └── 1.4 Fix admin endpoint (depends on 1.3)

Phase 2 (Auth/Session) ──── SECOND (auth fixes enable other work)
  ├── 2.1 Re-enable session manager (no deps)
  ├── 2.2 Fix auth listener flag (no deps)
  ├── 2.3 Add init timeout (no deps)
  ├── 2.4 Fix signup race condition (no deps)
  ├── 2.5 Reduce session cache (depends on 2.1)
  ├── 2.6 Middleware API auth (no deps)
  └── 2.7 Logout cleanup (depends on 2.2)

Phase 3 (Performance) ──── THIRD (can parallel with Phase 4)
  ├── 3.1 Fix invalidation cascade (no deps)
  ├── 3.2 Fix double refetch (no deps)
  ├── 3.3 Deduplicate queries (depends on 3.1)
  ├── 3.4 Fix session validation per query (depends on 2.1)
  ├── 3.5 Adjust staleTime (depends on 3.2)
  └── 3.6 Add Suspense boundaries (no deps)

Phase 4 (Security Hardening) ──── THIRD (parallel with Phase 3)
  ├── 4.1 Zod validation (no deps)
  ├── 4.2 CSRF protection (no deps)
  ├── 4.3 Rate limiting (no deps)
  ├── 4.4 Audit logging (no deps)
  └── 4.5 Sanitize logs (no deps)

Phase 5 (Headers & Config) ──── FOURTH
  ├── 5.1 CSP headers (no deps)
  └── 5.2 ESLint config (no deps)

Phase 6 (Verification) ──── LAST
  └── Full end-to-end verification
```

---

## Key Files to Modify

| File | Phases |
|------|--------|
| `apps/web/app/api/debug-env/route.ts` | 1.1 (DELETE) |
| `apps/web/app/api/debug-billing/route.ts` | 1.1 (DELETE) |
| `.env` | 1.2 (rotate keys) |
| `apps/web/lib/auth-utils.ts` | 1.3 |
| `apps/web/app/api/admin/users/route.ts` | 1.4 |
| `apps/web/lib/supabase/session-manager.ts` | 2.1 |
| `apps/web/lib/stores/auth.ts` | 2.2, 2.3, 2.4, 2.5, 2.7 |
| `apps/web/lib/supabase/middleware.ts` | 2.6 |
| `apps/web/lib/hooks/useTickets.ts` | 3.1, 3.3 |
| `apps/web/components/query-provider.tsx` | 3.2 |
| `apps/web/components/auto-refresh.tsx` | 3.2 (DELETE or refactor) |
| `apps/web/lib/hooks/useSessionAwareQuery.ts` | 3.4 |
| `apps/web/lib/hooks/*.ts` (all hooks) | 3.5 |
| `apps/web/app/` (layouts/pages) | 3.6 |
| `apps/web/app/api/billing/report/route.ts` | 4.1 |
| `apps/web/app/api/billing/payments/route.ts` | 4.1, 4.2 |
| `apps/web/app/api/invite-user/route.ts` | 4.1 |
| `apps/web/lib/audit.ts` | 4.4 (NEW) |
| `apps/web/next.config.mjs` | 5.1 |
| `eslint.config.js` (root) | 5.2 |

---

## Existing Utilities to Reuse

- **`withAuth()`** in `apps/web/lib/auth-utils.ts` — enhance, don't replace
- **`createServerClient()`** in `apps/web/lib/supabase/server.ts` — reuse for service role client
- **Zod** already installed (v4.3.6) — use for input validation schemas
- **`ticketKeys`/`projectKeys`** query key factories — refactor but keep the pattern
- **TanStack Query's `setQueryData`** — use for optimistic updates instead of invalidation
- **`session-manager.ts`** — re-enable existing code, don't rewrite

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Auth changes break login flow | Medium | Critical | Test all auth paths before/after |
| Query changes break data display | Low | High | Incremental changes, test each hook |
| Session manager causes conflicts | Medium | Medium | Add feature flag to disable quickly |
| CSP blocks legitimate resources | Medium | Medium | Start with report-only mode |
| Rate limiting blocks real users | Low | Medium | Set generous initial limits |
