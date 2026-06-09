import {test, expect} from '@playwright/test';
import {loginAsAdmin, createProject, openProject, uniqueName} from './fixtures/crud';

/**
 * Tickets CRUD against the live seeded DB.
 * Flow: create a host project → create a ticket in it → assert it shows on the
 * project detail + tickets list → edit assignee (Assignment card) → edit status
 * (edit page) → delete (detail page). Persistence is re-checked after reloads.
 *
 * The host project is left tagged `e2e-` (no UI affordance to delete it inline
 * without leaving the ticket flow); the ticket itself is fully deleted.
 */
test.describe('CRUD: Tickets', () => {
  test('create, list, assign, edit status, and delete a ticket', async ({page}) => {
    await loginAsAdmin(page);

    const projectName = uniqueName('TicketProj');
    const ticketTitle = uniqueName('Ticket');

    // Host project for the ticket.
    await createProject(page, projectName);
    const projectUrl = await openProject(page, projectName);

    // CREATE ticket via the project's "New Ticket" modal (project is preselected).
    await page
      .getByRole('button', {name: /new ticket/i})
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Create New Ticket')).toBeVisible();
    // The global "New Ticket" modal requires picking a project (not preselected).
    await dialog.getByLabel(/^project/i).selectOption({label: projectName});
    await dialog.getByLabel(/^title/i).fill(ticketTitle);
    const createBtn = dialog.getByRole('button', {name: /create ticket/i});
    await expect(createBtn).toBeEnabled();
    await createBtn.click();
    await expect(dialog).toBeHidden();

    // Created — verify on the project's tickets list. Re-navigate-poll to absorb
    // create-commit + cache timing.
    await expect(async () => {
      await page.goto(`${projectUrl}/tickets`);
      await expect(page.getByRole('link', {name: ticketTitle}).first()).toBeVisible({
        timeout: 4000,
      });
    }).toPass({timeout: 25000});

    // OPEN the ticket detail.
    await page.getByRole('link', {name: ticketTitle}).first().click();
    await expect(page).toHaveURL(/\/tickets\/[0-9a-f-]+$/i);
    await expect(page.getByRole('heading', {name: ticketTitle})).toBeVisible();

    // EDIT ASSIGNEE via the Assignment card (was created unassigned).
    await page.getByRole('button', {name: /assign ticket/i}).click();
    // User rows carry an email ("@"); the "Unassigned" option does not.
    await page.locator('button.rounded-lg').filter({hasText: '@'}).first().click();
    // Assigning succeeded → the card now offers a "Change" action.
    await expect(page.getByRole('button', {name: /change/i})).toBeVisible();
    // Persistence across reload.
    await page.reload();
    await expect(page.getByRole('button', {name: /change/i})).toBeVisible();

    // EDIT STATUS via the edit page form.
    await page.getByRole('link', {name: 'Edit', exact: true}).first().click();
    await expect(page).toHaveURL(/\/edit$/);
    await expect(page.getByLabel(/^title/i)).toHaveValue(ticketTitle);
    await page.getByLabel('Status').selectOption('in_progress');
    await page.getByRole('button', {name: /save changes/i}).click();
    await expect(page).toHaveURL(/\/tickets\/[0-9a-f-]+$/i);
    await page.reload();
    await expect(page.getByText(/in[\s_]?progress/i).first()).toBeVisible();

    // DELETE via the detail page (native confirm() → soft-delete → redirect).
    page.on('dialog', (d) => d.accept().catch(() => undefined));
    await page.getByRole('button', {name: /delete ticket/i}).click();
    await page.waitForURL(/\/tickets$/, {timeout: 15_000});
    await expect(page.getByRole('link', {name: ticketTitle})).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('link', {name: ticketTitle})).toHaveCount(0);
  });
});
