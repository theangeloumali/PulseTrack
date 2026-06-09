import {test, expect} from '@playwright/test';
import {loginAsAdmin, uniqueName} from './fixtures/crud';

/**
 * Clients + contacts CRUD against the live seeded DB.
 * Flow: create a client → open detail → add a contact (person in charge) →
 * verify it → edit it → delete it. Persistence is asserted at each step.
 *
 * There's no UI affordance to delete a client, so the client row is left tagged
 * `e2e-` for later cleanup; the contact is fully created, edited, and removed.
 */
test.describe('CRUD: Clients', () => {
  test('create a client, then add, edit, and delete a contact', async ({page}) => {
    await loginAsAdmin(page);

    const clientName = uniqueName('Client');
    const contactName = uniqueName('Contact');
    const contactRenamed = `${contactName}-edited`;

    // CREATE client.
    await page.goto('/clients');
    await page
      .getByRole('button', {name: /add client/i})
      .first()
      .click();
    const clientDialog = page.getByRole('dialog');
    await expect(clientDialog.getByText('Add Client')).toBeVisible();
    await clientDialog.getByLabel(/client name/i).fill(clientName);
    await clientDialog.getByLabel(/contact email/i).fill('e2e@client.test');
    await clientDialog.getByRole('button', {name: /create client/i}).click();

    // Persists into the clients table.
    await expect(page.getByText(clientName).first()).toBeVisible();

    // OPEN detail (row click navigates).
    await page.getByText(clientName).first().click();
    await expect(page).toHaveURL(/\/clients\/[0-9a-f-]+$/i);
    await expect(page.getByRole('heading', {name: clientName})).toBeVisible();

    // ADD contact.
    await page
      .getByRole('button', {name: /add contact/i})
      .first()
      .click();
    let contactDialog = page.getByRole('dialog');
    // "Add Contact" is both the dialog title and the submit button — scope to the title.
    await expect(contactDialog.getByText('Add Contact').first()).toBeVisible();
    await contactDialog.getByLabel(/^name/i).fill(contactName);
    await contactDialog.getByLabel(/title/i).fill('Account Manager');
    await contactDialog.getByLabel(/email/i).fill('jane@client.test');
    await contactDialog.getByRole('button', {name: /add contact/i}).click();

    // Persists into the "Persons in charge" list (count is now a separate badge).
    await expect(page.getByText(contactName)).toBeVisible();
    await expect(page.getByText(/persons in charge/i).first()).toBeVisible();

    // EDIT contact (pencil icon button → Edit Contact modal).
    await page.locator('button:has(svg.lucide-pencil)').first().click();
    contactDialog = page.getByRole('dialog');
    await expect(contactDialog.getByText('Edit Contact')).toBeVisible();
    await contactDialog.getByLabel(/^name/i).fill(contactRenamed);
    await contactDialog.getByRole('button', {name: /save contact/i}).click();
    await expect(page.getByText(contactRenamed)).toBeVisible();
    await expect(page.getByText(contactName, {exact: true})).toHaveCount(0);

    // DELETE contact (trash icon button → confirm AlertDialog).
    await page.locator('button:has(svg.lucide-trash-2)').first().click();
    const alert = page.getByRole('alertdialog');
    await expect(alert.getByText(/remove contact/i)).toBeVisible();
    await alert.getByRole('button', {name: /^remove$/i}).click();

    // Gone — list back to empty.
    await expect(page.getByText(contactRenamed)).toHaveCount(0);
    await expect(page.getByText(/persons in charge/i).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(contactRenamed)).toHaveCount(0);
  });
});
