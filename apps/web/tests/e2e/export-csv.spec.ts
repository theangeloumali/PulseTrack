import {test, expect} from '@playwright/test';
import {loginAsAdmin} from './fixtures/crud';

/** Verify the CSV (Google-Sheet-importable) export actually downloads a file. */
test('Export CSV downloads from the Clients page', async ({page}) => {
  await loginAsAdmin(page);
  await page.goto('/clients');
  await expect(page.getByRole('heading', {name: /clients/i})).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download', {timeout: 15_000}),
    page
      .getByRole('button', {name: /export csv/i})
      .first()
      .click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/clients.*\.csv$/i);
});
