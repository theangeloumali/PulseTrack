#!/usr/bin/env node
/**
 * load-baseline.mjs — PulseTrack PAGE-LOAD baseline harness (CHARLIE squad)
 * ----------------------------------------------------------------------------
 * WHAT THIS IS
 *   A zero-dependency, pure-Node (global fetch + performance.now) probe that
 *   hits a *running* PulseTrack server and records per-route page-load signals:
 *     - HTTP status
 *     - TTFB        (ms, time until response headers arrive)
 *     - total       (ms, time until the full HTML body is read)
 *     - htmlKB      (transferred HTML bytes of the document response)
 *     - <script>    (count of <script> tags in the returned HTML — a proxy
 *                    for how much JS the document ships before hydration)
 *   It prints a Markdown table you can paste into a PR or the baseline doc.
 *
 * WHAT THIS IS NOT
 *   This is NOT the full performance baseline. It only measures the *document*
 *   response over the wire — it does NOT execute JS, does NOT measure LCP/TTI/
 *   TBT, and does NOT size the JS chunks the <script> tags pull in. For the
 *   real budget gate (First Load JS, LCP, TTI, TBT, Lighthouse Perf score) see
 *   the companion procedure:
 *     docs/plans/pulsetrack-load-baseline-howto-2026-06-07.md
 *   Use this script for fast, repeatable, CI-friendly regression smell-tests;
 *   use `next build` + Lighthouse for the authoritative numbers.
 *
 * PREREQUISITES
 *   1. Build the app separately:   pnpm build   (this script does NOT build)
 *   2. Start a server:             pnpm start   (prod)  OR  pnpm dev
 *   3. (Optional) grab an authenticated Supabase cookie from your browser
 *      devtools (Application → Cookies) so protected routes return 200 instead
 *      of redirecting to /login.
 *
 * USAGE
 *   node scripts/load-baseline.mjs
 *   node scripts/load-baseline.mjs --url http://localhost:4649
 *   node scripts/load-baseline.mjs --cookie "sb-xxxx-auth-token=..."
 *   BASE_URL=http://localhost:4649 AUTH_COOKIE="sb-...=..." node scripts/load-baseline.mjs
 *   node scripts/load-baseline.mjs --routes /,/login,/billing   (override list)
 *   node scripts/load-baseline.mjs --json                       (emit JSON too)
 *
 * EXIT CODE
 *   0 always (this is a measurement tool, not a gate). Wire budget assertions
 *   in CI on top of the --json output if you want it to fail builds.
 */

const DEFAULT_BASE_URL = 'http://localhost:4649';

const DEFAULT_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/dashboard',
  '/projects',
  '/tickets',
  '/billing',
  '/time-tracking',
  '/clients',
  '/admin/companies',
];

function parseArgs(argv) {
  const args = {url: null, cookie: null, routes: null, json: false};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') args.url = argv[++i];
    else if (a === '--cookie') args.cookie = argv[++i];
    else if (a === '--routes') args.routes = argv[++i];
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function resolveConfig() {
  const cli = parseArgs(process.argv.slice(2));
  if (cli.help) {
    console.log(
      'Usage: node scripts/load-baseline.mjs [--url <baseUrl>] [--cookie <cookie>] [--routes a,b,c] [--json]',
    );
    process.exit(0);
  }
  const baseUrl = (cli.url || process.env.BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const cookie = cli.cookie || process.env.AUTH_COOKIE || null;
  const routes = cli.routes
    ? cli.routes
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
    : DEFAULT_ROUTES;
  return {baseUrl, cookie, routes, json: cli.json};
}

/** Count <script ...> opening tags in an HTML string (proxy for shipped JS). */
function countScriptTags(html) {
  const matches = html.match(/<script\b/gi);
  return matches ? matches.length : 0;
}

/**
 * Probe a single route. Measures:
 *   - ttfb:  perf delta from request start until fetch() resolves (headers in)
 *   - total: perf delta from request start until the body is fully read
 *   - bytes: byte length of the decoded HTML body
 */
async function probeRoute(baseUrl, route, cookie) {
  const url = `${baseUrl}${route}`;
  const headers = {
    Accept: 'text/html,application/xhtml+xml',
    'User-Agent': 'pulsetrack-load-baseline/1.0',
  };
  if (cookie) headers.Cookie = cookie;

  const start = performance.now();
  try {
    // `redirect: manual` so auth redirects (302 → /login) are recorded as the
    // real status of the requested route rather than silently followed.
    const res = await fetch(url, {headers, redirect: 'manual'});
    const ttfb = performance.now() - start;
    const body = await res.text();
    const total = performance.now() - start;
    const bytes = Buffer.byteLength(body, 'utf8');
    return {
      route,
      status: res.status,
      location: res.headers.get('location') || '',
      ttfb,
      total,
      bytes,
      scripts: countScriptTags(body),
      error: null,
    };
  } catch (err) {
    const total = performance.now() - start;
    return {
      route,
      status: 0,
      location: '',
      ttfb: 0,
      total,
      bytes: 0,
      scripts: 0,
      error: err?.message || String(err),
    };
  }
}

function kb(bytes) {
  return (bytes / 1024).toFixed(1);
}

function ms(value) {
  return value.toFixed(0);
}

function printMarkdown(baseUrl, cookie, results) {
  const stamp = new Date().toISOString();
  console.log(`# PulseTrack page-load baseline`);
  console.log('');
  console.log(`- Base URL: \`${baseUrl}\``);
  console.log(`- Authenticated: ${cookie ? 'yes (cookie supplied)' : 'no (anonymous)'}`);
  console.log(`- Captured: ${stamp}`);
  console.log('');
  console.log('| Route | Status | TTFB (ms) | Total (ms) | HTML (KB) | <script> |');
  console.log('| ----- | ------ | --------- | ---------- | --------- | -------- |');
  for (const r of results) {
    const note = r.error
      ? ` ⚠️ ${r.error}`
      : r.status >= 300 && r.status < 400 && r.location
        ? ` → ${r.location}`
        : '';
    console.log(
      `| \`${r.route}\` | ${r.status || 'ERR'}${note} | ${ms(r.ttfb)} | ${ms(r.total)} | ${kb(r.bytes)} | ${r.scripts} |`,
    );
  }

  const ok = results.filter((r) => !r.error && r.bytes > 0);
  if (ok.length) {
    const avg = (sel) => ok.reduce((s, r) => s + sel(r), 0) / ok.length;
    console.log('');
    console.log(
      `_Avg over ${ok.length} responding routes — TTFB ${ms(avg((r) => r.ttfb))}ms · total ${ms(
        avg((r) => r.total),
      )}ms · HTML ${kb(avg((r) => r.bytes))}KB · ${avg((r) => r.scripts).toFixed(1)} script tags._`,
    );
  }
  console.log('');
  console.log(
    '_Note: HTML bytes + <script> count measure only the document response. They do NOT include parsed/executed JS chunk weight (First Load JS) — see docs/plans/pulsetrack-load-baseline-howto-2026-06-07.md for the authoritative budget procedure._',
  );
}

async function main() {
  const {baseUrl, cookie, routes, json} = resolveConfig();
  console.error(`Probing ${routes.length} routes against ${baseUrl} ...`);

  // Sequential on purpose: parallel requests skew TTFB/total via local
  // contention. We want clean per-route timings, not throughput.
  const results = [];
  for (const route of routes) {
    const r = await probeRoute(baseUrl, route, cookie);
    results.push(r);
    console.error(`  ${r.error ? '✗' : '✓'} ${route} → ${r.status || 'ERR'} (${ms(r.total)}ms)`);
  }

  printMarkdown(baseUrl, cookie, results);
  if (json) {
    console.log('');
    console.log('```json');
    console.log(JSON.stringify({baseUrl, authenticated: Boolean(cookie), results}, null, 2));
    console.log('```');
  }
}

main().catch((err) => {
  console.error('load-baseline failed:', err);
  process.exit(1);
});
