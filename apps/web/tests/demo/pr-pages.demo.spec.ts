import {test} from '@playwright/test';
import {loginAs} from '../e2e/fixtures/accounts';
import {installCursor, humanClick, typeInto, navTo, scenePause, glanceHeading} from './cursor';

/**
 * ONE continuous cursor-driven walkthrough of the PR pages → one video.
 * admin@ (company owner): Clients list (search/sort) → Client detail (+ invoices)
 * → Client Heat Map (hot/warm/cool cards → tier filter → matrix → drill-down).
 */
test.describe('PulseTrack PR pages demo', () => {
  test('Client management and Heat Map walkthrough', async ({page}) => {
    await installCursor(page);

    await loginAs(page, 'admin@pulsetrack.demo');
    await glanceHeading(page, /welcome back/i).catch(() => undefined);
    await scenePause(page, 1100);

    // ── Clients list ───────────────────────────────────────────────
    await navTo(page, 'Clients');
    await glanceHeading(page, /clients/i);
    await scenePause(page, 1000);
    const search = page.getByRole('searchbox').first();
    if (await search.isVisible().catch(() => false)) {
      await typeInto(search, 'Acme');
      await scenePause(page, 1300);
      const clearBtn = page.getByRole('button', {name: /clear/i}).first();
      if (await clearBtn.isVisible().catch(() => false)) await humanClick(clearBtn);
      await scenePause(page, 700);
    }

    // ── Client detail (+ invoices) ─────────────────────────────────
    await humanClick(page.getByText('Acme Corp', {exact: false}).first());
    await page.waitForURL(/\/clients\/.+/).catch(() => undefined);
    await glanceHeading(page, /acme corp/i).catch(() => undefined);
    await scenePause(page, 1400);
    // reveal the Invoices section
    await page.mouse.wheel(0, 500);
    await scenePause(page, 1500);
    await page.mouse.wheel(0, 400);
    await scenePause(page, 1400);

    // ── Heat Map ───────────────────────────────────────────────────
    await navTo(page, 'Heat Map');
    await glanceHeading(page, /heat ?map/i);
    await scenePause(page, 1300);
    // filter to Warm (Acme — the client needing attention), then back to All
    const warm = page.getByRole('button', {name: /^warm/i}).first();
    if (await warm.isVisible().catch(() => false)) {
      await humanClick(warm);
      await scenePause(page, 1300);
      const all = page.getByRole('button', {name: /^all/i}).first();
      if (await all.isVisible().catch(() => false)) await humanClick(all);
      await scenePause(page, 900);
    }
    // toggle Matrix view, linger, back to Cards
    const matrix = page.getByRole('button', {name: /^matrix/i}).first();
    if (await matrix.isVisible().catch(() => false)) {
      await humanClick(matrix);
      await scenePause(page, 1800);
      const cards = page.getByRole('button', {name: /^cards/i}).first();
      if (await cards.isVisible().catch(() => false)) await humanClick(cards);
      await scenePause(page, 900);
    }
    // drill into the hot client
    await humanClick(page.getByText('Acme Corp', {exact: false}).first());
    await scenePause(page, 2000);
  });
});
