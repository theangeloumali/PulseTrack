import {test, expect} from '@playwright/test';
import {loginAsAdmin} from './fixtures/crud';

/**
 * Proves the Tenant→Client→Project hierarchy is wired end-to-end:
 * create a project, assign it to a client, and confirm it shows under that client.
 */
test('a project assigned to a client appears under that client', async ({page}) => {
  await loginAsAdmin(page);
  const projName = `e2e-link-${Date.now()}`;

  // Create a project and assign it to Acme Corp via the client selector.
  await page.goto('/projects');
  await page
    .getByRole('button', {name: /new project/i})
    .first()
    .click();
  await expect(page.getByText('Create New Project')).toBeVisible();
  await page.getByLabel(/project name/i).fill(projName);
  await page.getByLabel(/^client/i).selectOption({label: 'Acme Corp'});
  await page.getByRole('button', {name: /create project/i}).click();
  await expect(page.getByText('Create New Project')).toBeHidden({timeout: 15_000});

  // It must now appear under Acme Corp on the client detail page.
  await page.goto('/clients');
  await page.getByText('Acme Corp', {exact: false}).first().click();
  await page.waitForURL(/\/clients\/.+/);
  await expect(page.getByText(projName).first()).toBeVisible({timeout: 15_000});
});
