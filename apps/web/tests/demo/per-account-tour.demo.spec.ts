import {test} from '@playwright/test';
import {
  ACCOUNTS,
  ADMIN_PAGES,
  CORE_PAGES,
  loginAs,
  type DemoAccount,
} from '../e2e/fixtures/accounts';
import {glanceHeading, installCursor, scenePause, smoothMoveTo} from './cursor';

/**
 * One short guided tour PER seeded account → one video per account.
 *
 * Each role only sees the pages it is allowed to load (the app redirects
 * unauthorized roles), so the tour is gated by role rank. The visible cursor
 * + scene beats make each tour read as a real per-role walkthrough.
 */

const ROLE_RANK: Record<DemoAccount['role'], number> = {
  user: 1,
  manager: 2,
  company_admin: 3,
  system_admin: 4,
  super_admin: 5,
};

function rankOf(role: string): number {
  return ROLE_RANK[role as DemoAccount['role']] ?? 0;
}

/** Pages this account is allowed to visit, in tour order. */
function allowedPages(account: DemoAccount): Array<{path: string; heading: RegExp}> {
  const admin = ADMIN_PAGES.filter((entry) => rankOf(account.role) >= rankOf(entry.minRole)).map(
    ({path, heading}) => ({path, heading}),
  );
  return [...CORE_PAGES, ...admin];
}

for (const account of ACCOUNTS) {
  test(`Account tour - ${account.label} (${account.role})`, async ({page}) => {
    await installCursor(page);

    await loginAs(page, account.email);
    await glanceHeading(page, /welcome back|dashboard/i);
    await smoothMoveTo(page, 700, 420);
    await scenePause(page, 1300);

    for (const view of allowedPages(account)) {
      await page.goto(view.path);
      await page.waitForLoadState('networkidle').catch(() => undefined);
      // Travel the cursor across the page so the recording shows motion.
      await smoothMoveTo(page, 320, 220);
      await glanceHeading(page, view.heading);
      await smoothMoveTo(page, 820, 380);
      await scenePause(page, 1300);
    }

    await smoothMoveTo(page, 700, 460);
    await scenePause(page, 1000);
  });
}
