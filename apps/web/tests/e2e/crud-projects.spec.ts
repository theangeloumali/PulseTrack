import {test, expect} from '@playwright/test';
import {loginAsAdmin, createProject, openProject, uniqueName} from './fixtures/crud';

/**
 * Projects CRUD against the live seeded DB.
 * Flow: create → see in list → open → edit name → delete (also cleans up the row).
 * Every step asserts the change actually persisted through the UI.
 */
test.describe('CRUD: Projects', () => {
  test('create, list, open, edit name, and delete a project', async ({page}) => {
    await loginAsAdmin(page);

    const name = uniqueName('Project');
    const renamed = `${name}-edited`;

    // CREATE
    await createProject(page, name);

    // LIST — the new project is rendered in the grid as a title link.
    await expect(page.getByRole('link', {name}).first()).toBeVisible();

    // OPEN — navigate to the detail page.
    await openProject(page, name);

    // EDIT — change the name via the edit page form.
    await page.getByRole('link', {name: 'Edit', exact: true}).first().click();
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+\/edit$/i);
    await page.getByLabel(/project name/i).fill(renamed);
    await page.getByRole('button', {name: /save changes/i}).click();

    // Redirects back to detail; reload to read the persisted (DB) name
    // (detail page reads a cached query, so the edit shows after refetch).
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/i);
    await page.reload();
    await expect(page.getByRole('heading', {name: renamed})).toBeVisible();

    // DELETE — via the edit page confirm dialog (doubles as row cleanup).
    await page.getByRole('link', {name: 'Edit', exact: true}).first().click();
    await page
      .getByRole('button', {name: /delete project/i})
      .first()
      .click();
    const confirm = page.locator('.fixed.inset-0').filter({hasText: 'Delete Project'});
    await confirm.getByRole('button', {name: /delete project/i}).click();

    // Back to the list, and the project is gone.
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole('link', {name: renamed})).toHaveCount(0);

    // Persistence across reload — still absent.
    await page.reload();
    await expect(page.getByRole('link', {name: renamed})).toHaveCount(0);
  });
});
