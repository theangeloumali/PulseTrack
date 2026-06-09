import {expect, type Page} from '@playwright/test';
import {loginAs} from './accounts';

/**
 * Shared helpers for the CRUD E2E suite. These specs hit the LIVE seeded DB and
 * actually create / edit / delete rows, then assert persistence through the UI.
 *
 * Reuse over duplication: project creation is needed by both the projects and
 * tickets specs, so it lives here (REUSE-FIRST). Every row created by the suite
 * is named with an `e2e-` prefix + timestamp so reruns never collide and the
 * rows are trivially greppable for later cleanup.
 */

/** Company-admin owner of "ZKidz Studio" — can create projects/tickets/clients/invoices. */
export const ADMIN_EMAIL = 'admin@pulsetrack.demo';

/** Timestamped, e2e-tagged name so reruns never collide and rows are greppable. */
export function uniqueName(prefix: string): string {
  return `e2e-${prefix}-${Date.now()}`;
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, ADMIN_EMAIL);
}

/**
 * Create a project via the Projects page modal. Leaves the app on /projects
 * with the new project visible in the grid.
 */
export async function createProject(page: Page, name: string): Promise<void> {
  await page.goto('/projects');
  await page
    .getByRole('button', {name: /new project/i})
    .first()
    .click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Create New Project')).toBeVisible();
  await dialog.getByLabel(/project name/i).fill(name);
  await dialog.getByRole('button', {name: /create project/i}).click();

  // Modal closes on success and the new project lands in the grid.
  await expect(page.getByText(name).first()).toBeVisible();
}

/**
 * Open a project from the Projects grid by clicking its title link.
 * Asserts navigation to the project detail page.
 */
export async function openProject(page: Page, name: string): Promise<string> {
  await page.getByRole('link', {name}).first().click();
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+$/i);
  await expect(page.getByRole('heading', {name})).toBeVisible();
  return page.url();
}
