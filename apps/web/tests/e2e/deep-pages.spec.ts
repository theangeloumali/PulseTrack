import {test, expect, type Response} from '@playwright/test';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {loginAs} from './fixtures/accounts';

/**
 * Every dynamic [id] page, loaded with REAL ids (from _gen-deep-ids.mjs), asserted
 * to render with no uncaught error and no failed (>=400) app request.
 */
const ids = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'tests/e2e/.deep-ids.json'), 'utf8'),
) as {companyId: string; projectId: string; ticketId: string; clientId: string};

function isAppFailure(res: Response): boolean {
  const url = res.url();
  if (res.status() < 400) return false;
  if (/\/_next\/|favicon|\.map$|hot-update|__nextjs|vercel-scripts/.test(url)) return false;
  return true;
}

async function visitAll(page: import('@playwright/test').Page, routes: string[]) {
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const renderFailures: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(`${e.name}: ${e.message}`));
  page.on('response', (res) => {
    if (isAppFailure(res)) failedRequests.push(`${res.status()} ${res.url()}`);
  });

  for (const route of routes) {
    await test.step(`visit ${route}`, async () => {
      const resp = await page.goto(route, {waitUntil: 'networkidle'}).catch(() => null);
      if (/\/login/.test(page.url())) {
        renderFailures.push(`${route} → bounced to /login`);
        return;
      }
      const mainOk = await page
        .locator('main, [role=main]')
        .first()
        .isVisible()
        .catch(() => false);
      const h1Ok = await page
        .locator('h1')
        .first()
        .isVisible()
        .catch(() => false);
      if (!mainOk && !h1Ok) renderFailures.push(`${route} → no main/h1 rendered`);
      if (resp && resp.status() >= 500) failedRequests.push(`${resp.status()} ${route}`);
    });
  }
  return {pageErrors, failedRequests, renderFailures};
}

test('owner — every project/ticket/client dynamic page loads clean', async ({page}) => {
  await loginAs(page, 'admin@pulsetrack.demo');
  const {projectId, ticketId, clientId} = ids;
  const {pageErrors, failedRequests, renderFailures} = await visitAll(page, [
    `/clients/${clientId}`,
    `/projects/${projectId}`,
    `/projects/${projectId}/edit`,
    `/projects/${projectId}/tickets`,
    `/projects/${projectId}/tickets/new`,
    `/projects/${projectId}/tickets/${ticketId}`,
    `/projects/${projectId}/tickets/${ticketId}/edit`,
  ]);
  expect(pageErrors, 'uncaught errors').toEqual([]);
  expect(failedRequests, 'failed app requests').toEqual([]);
  expect(renderFailures, 'render failures').toEqual([]);
});

test('super admin — admin company detail loads clean', async ({page}) => {
  await loginAs(page, 'superadmin@pulsetrack.demo');
  const {pageErrors, failedRequests, renderFailures} = await visitAll(page, [
    `/admin/companies/${ids.companyId}`,
  ]);
  expect(pageErrors, 'uncaught errors').toEqual([]);
  expect(failedRequests, 'failed app requests').toEqual([]);
  expect(renderFailures, 'render failures').toEqual([]);
});
