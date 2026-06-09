import {test, expect} from '@playwright/test';
import {loginAsAdmin} from './fixtures/crud';

/** Phase 1 proof: the Client Heat Map renders ranked clients (clean Playwright context, no stale SW). */
test('Client Heat Map renders ranked clients', async ({page}) => {
  await loginAsAdmin(page);
  await page.goto('/clients/heatmap', {waitUntil: 'networkidle'});

  await expect(page.getByRole('heading', {name: /heat ?map/i})).toBeVisible({timeout: 20_000});
  // At least one seeded client appears on the heat map.
  await expect(page.getByText(/Acme Corp|Umbrella LLC|Initech/).first()).toBeVisible({timeout: 20_000});

  await page.screenshot({path: 'heatmap-verify.png', fullPage: true});
});
