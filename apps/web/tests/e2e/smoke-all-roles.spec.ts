import {test, expect, type ConsoleMessage, type Response} from '@playwright/test';
import {ACCOUNTS, loginAs, type DemoAccount} from './fixtures/accounts';

/**
 * Smoke: every seeded account logs in and visits every page its role can access.
 * Fails if any page throws an uncaught error or makes a failed (>=400) app request.
 * Produces one video per account (Playwright video:on).
 */

interface PageDef {
  path: string;
  heading: RegExp;
}

function pagesForRole(role: DemoAccount['role']): PageDef[] {
  const core: PageDef[] = [
    {path: '/dashboard', heading: /welcome|dashboard|overview/i},
    {path: '/projects', heading: /projects/i},
    {path: '/tickets', heading: /tickets/i},
    {path: '/time-tracking', heading: /time/i},
    {path: '/billing', heading: /billing|invoice|payment/i},
    {path: '/activity', heading: /activity|recent|feed/i},
  ];
  const managerPlus: PageDef[] = [
    {path: '/clients', heading: /clients/i},
    {path: '/clients/heatmap', heading: /heat ?map/i},
    {path: '/company/users', heading: /company|users|team|members/i},
    {path: '/settings', heading: /settings|profile/i},
  ];
  const superOnly: PageDef[] = [
    {path: '/admin/companies', heading: /companies/i},
    {path: '/admin/users', heading: /users/i},
  ];
  if (role === 'super_admin') return [...core, ...managerPlus, ...superOnly];
  if (role === 'system_admin' || role === 'company_admin' || role === 'manager')
    return [...core, ...managerPlus];
  return core; // plain user
}

// Ignore noise that isn't an app failure (favicon, third-party, hot-reload).
function isAppFailure(res: Response): boolean {
  const url = res.url();
  if (res.status() < 400) return false;
  if (/\/_next\/|favicon|\.map$|hot-update|__nextjs/.test(url)) return false;
  return true;
}

for (const account of ACCOUNTS) {
  test(`${account.label} (${account.role}) — all pages load clean`, async ({page}) => {
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    const consoleErrors: string[] = [];
    const renderFailures: string[] = [];

    page.on('pageerror', (e) => pageErrors.push(`${e.name}: ${e.message}`));
    page.on('console', (m: ConsoleMessage) => {
      if (m.type() === 'error' && !/favicon|_next|hydrat/i.test(m.text()))
        consoleErrors.push(m.text());
    });
    page.on('response', (res) => {
      if (isAppFailure(res))
        failedRequests.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    });

    await loginAs(page, account.email);

    // Soft-collect across the whole tour so ONE run surfaces every broken page.
    for (const def of pagesForRole(account.role)) {
      await test.step(`visit ${def.path}`, async () => {
        const resp = await page.goto(def.path, {waitUntil: 'networkidle'}).catch(() => null);
        if (/\/login/.test(page.url())) {
          renderFailures.push(`${def.path} → bounced to /login (auth/access lost)`);
          return;
        }
        const headingOk = await page
          .getByRole('heading', {name: def.heading})
          .first()
          .isVisible()
          .catch(() => false);
        const mainOk = await page
          .locator('main, [role=main]')
          .first()
          .isVisible()
          .catch(() => false);
        if (!headingOk && !mainOk)
          renderFailures.push(`${def.path} → did not render (no heading/main)`);
        if (resp && resp.status() >= 500) failedRequests.push(`${resp.status()} GET ${def.path}`);
      });
    }

    // Truth-check: nothing crashed, no failed app requests, every page rendered.
    if (consoleErrors.length)
      console.log(`[${account.email}] console errors:\n  ` + consoleErrors.join('\n  '));
    expect(pageErrors, `uncaught errors for ${account.email}`).toEqual([]);
    expect(failedRequests, `failed app requests for ${account.email}`).toEqual([]);
    expect(renderFailures, `page render failures for ${account.email}`).toEqual([]);
  });
}
