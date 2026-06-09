# PulseTrack — Page-Load Baseline Procedure & CHARLIE Squad Worklist (2026-06-07)

This doc defines the **authoritative** way to baseline PulseTrack page-load
performance and sets the **TARGET budget** every route must hit. The quick
probe script (`apps/web/scripts/load-baseline.mjs`) is a fast regression
smell-test; this procedure is the source of truth for the budget gate.

---

## 0. Quick probe (smell-test, not the gate)

```bash
# 1. build + start a server first (probe does NOT build)
pnpm build && pnpm start          # prod server on :4649
# 2. run the probe
node apps/web/scripts/load-baseline.mjs --url http://localhost:4649
# 3. for protected routes, paste an authed Supabase cookie from devtools:
node apps/web/scripts/load-baseline.mjs \
  --cookie "sb-<project>-auth-token=<value>"
```

Records per route: HTTP status, TTFB, total time, transferred HTML bytes,
`<script>` tag count. **Caveat:** this measures only the _document_ response
over the wire. It does not execute JS, so it cannot see First Load JS chunk
weight, LCP, TTI, or TBT. Use the steps below for those.

---

## 1. `next build` output — interpreting First Load JS

```bash
cd apps/web && pnpm build
```

The route table at the end of the build is the primary budget instrument:

```
Route (app)                     Size     First Load JS
┌ ○ /                           1.2 kB        110 kB
├ ○ /billing                    5.4 kB        260 kB   ← over budget
└ ○ /dashboard                  3.1 kB        180 kB
+ First Load JS shared by all                  90 kB
  ├ chunks/framework-*.js                      45 kB
  └ chunks/main-*.js                           30 kB
```

How to read it:

- **First Load JS** = shared baseline + that route's own JS. This is the number
  the budget gates on (the JS a user downloads + parses before the page is
  interactive). The figures next to the table are **gzipped**.
- **Size** = the route-specific delta (not the gating number on its own).
- **Shared by all** = the floor every route pays. Trimming this (e.g. moving a
  heavy provider behind `next/dynamic`) helps every route at once.
- Markers: `○` (Static / prerendered), `λ`/`ƒ` (Server-rendered on demand),
  `●` (SSG with data). Static is cheapest; prefer it where possible.
- Any route whose First Load JS is well above the shared floor is carrying a
  heavy client dependency — chase it with the bundle analyzer (step 2).

---

## 2. `@next/bundle-analyzer` — find what's in the chunks

Install and wire it (dev-only dependency):

```bash
cd apps/web && pnpm add -D @next/bundle-analyzer
```

In `next.config.*`:

```js
import withBundleAnalyzer from "@next/bundle-analyzer";

const analyze = withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

export default analyze(nextConfig);
```

Run it:

```bash
ANALYZE=true pnpm build
```

This opens treemap HTML reports (client + server + edge bundles). Reading them:

- Look for large single rectangles — a heavy dep landing in a route's client
  bundle (e.g. `jspdf`, `xlsx`, charting libs, a modal pulled in eagerly).
- Anything that should be lazy (only used behind a click) but appears in the
  initial chunk is a `next/dynamic` candidate.
- Cross-reference with the `next build` table: a route that's high on First Load
  JS should have an obvious culprit rectangle here.

---

## 3. Lighthouse — LCP / TTI / TBT / Perf score

Run against the **production** server (`pnpm build && pnpm start`), never the
dev server (dev disables minification + adds HMR overhead and inflates every
number).

```bash
# Desktop preset
npx lighthouse http://localhost:4649/ \
  --preset=desktop \
  --only-categories=performance \
  --output=html --output-path=./lh-desktop-home.html

# Mobile (default form factor) with applied throttling — the stricter gate
npx lighthouse http://localhost:4649/ \
  --only-categories=performance \
  --throttling-method=simulate \
  --output=html --output-path=./lh-mobile-home.html
```

Notes:

- `--preset=desktop` applies the desktop viewport + lighter throttling. Omitting
  it defaults to mobile + 4x CPU / slow-4G simulated throttling — the harder,
  more representative gate. Capture both; budget on mobile.
- For authenticated routes, pass a cookie via a Lighthouse config with
  `extraHeaders`, or run an authed Chrome session with
  `--port=<remote-debug-port>`.
- Run each route 3x and take the median — single runs are noisy.

Metrics that matter (from the Performance category):

- **LCP** (Largest Contentful Paint) — when the main content renders.
- **TTI** (Time to Interactive) — when the page reliably responds to input.
- **TBT** (Total Blocking Time) — main-thread blocking between FCP and TTI;
  the best lab proxy for "feels janky." Heavy First Load JS shows up here.
- **Performance score** (0–100) — weighted composite.

---

## 4. TARGET budget (the gate)

Every route must hit, on the **mobile/throttled** profile:

| Metric                        | Budget               |
| ----------------------------- | -------------------- |
| **LCP**                       | **< 2.0 s**          |
| **TTI**                       | **< 2.5 s**          |
| **First Load JS** (per route) | **< 200 KB gzipped** |
| **Lighthouse Performance**    | **>= 90**            |

A route is "green" only when all four pass. The probe script's `<script>` count
and HTML-KB columns are leading indicators, not the gate — a route can pass the
probe and still blow the First Load JS / TBT budget.

---

## 5. KNOWN load offenders — CHARLIE squad worklist

These are already-confirmed regressions. Fixing them is the CHARLIE squad's
worklist; each should move at least one budget number above.

1. **823 KB favicon (`icon.png`) served on every page.** A ~0.8 MB image is
   shipped as the favicon on every single route. Replace with a properly sized
   `.ico` / small PNG (a favicon should be a few KB). Pure win on every route's
   transferred bytes. **High priority — affects 100% of pages.**

2. **`cover-banner.png` (1966 KB) — UNREFERENCED dead asset.** ~1.9 MB image
   with no importers. Delete it. (Dead-code mandate: deletions are wins.)

3. **`landing-logo.png` (1326 KB) — UNREFERENCED dead asset.** ~1.3 MB image
   with no importers. Delete it.

4. **`jspdf` + `ComprehensiveBillingModal` eagerly bundled in the billing
   route.** PDF generation and the heavy billing modal load on initial render
   of `/billing` even though they're only needed behind a user action. Move
   both behind `next/dynamic` (and dynamic-`import()` `jspdf` at click time).
   Directly attacks the over-budget First Load JS on `/billing`.

5. **90 `'use client'` files.** Excessive client-component surface pushes work
   into the browser bundle that could be Server Components. Audit which truly
   need client interactivity; convert the rest to Server Components to shrink
   the shared First Load JS floor (helps every route).

6. **`refetchOnWindowFocus: true` set globally (TanStack Query).** Every tab
   refocus triggers a refetch storm across all active queries — wasted network
   and main-thread work that degrades perceived performance and TBT. Set to
   `false` globally and opt-in per query where live freshness is actually
   needed.

### Suggested attack order

```
Bytes-on-the-wire wins first (cheap, high impact):
  #1 favicon  →  #2 cover-banner delete  →  #3 landing-logo delete
JS / interactivity wins next:
  #4 billing dynamic import  →  #6 refetchOnWindowFocus  →  #5 'use client' audit
```

Re-run `node apps/web/scripts/load-baseline.mjs` after each fix for a fast
before/after, and run the full `next build` + Lighthouse pass (steps 1–3) to
confirm the budget gate (step 4) before closing each item.
