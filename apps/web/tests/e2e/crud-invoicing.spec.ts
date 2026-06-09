import {test, expect} from '@playwright/test';
import {loginAsAdmin} from './fixtures/crud';

/**
 * Client invoicing against the live seeded DB.
 * Flow: open Acme Corp (seeded client with time entries) → generate an invoice
 * over a wide period (captures seeded billable time) → assert a draft with line
 * items + a total > 0 → mark sent → mark paid → export the PDF.
 *
 * A wide period is used on purpose: the generate modal defaults to "last month",
 * but seeded time-entry dates aren't guaranteed there, so we widen the window to
 * deterministically pick up the seeded hours.
 *
 * CSV: the client-invoice actions menu in this build offers Mark sent / Mark paid
 * / View PDF / Void — there is NO CSV export here (CSV export lives on the
 * separate /billing PDFExporter). We assert the PDF path (a real download) and
 * soft-flag CSV absence rather than failing on a control that doesn't exist.
 */
test.describe('CRUD: Client invoicing', () => {
  test('generate an Acme Corp invoice, mark sent then paid, and export PDF', async ({page}) => {
    await loginAsAdmin(page);

    // Open the seeded client that has billable time.
    await page.goto('/clients');
    await expect(page.getByText('Acme Corp').first()).toBeVisible();
    await page.getByText('Acme Corp').first().click();
    await expect(page.getByRole('heading', {name: 'Acme Corp'})).toBeVisible();

    // GENERATE over a wide period so seeded time entries are captured.
    await page.getByRole('button', {name: /generate invoice/i}).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Generate Invoice')).toBeVisible();
    await dialog.getByLabel(/period start/i).fill('2024-01-01');
    await dialog.getByLabel(/period end/i).fill('2026-12-31');
    await dialog.getByLabel(/tax rate/i).fill('10');
    await dialog.getByRole('button', {name: /generate draft/i}).click();

    // Draft created — capture the invoice number from the success banner.
    await expect(dialog.getByText(/draft .* created/i)).toBeVisible({timeout: 30_000});
    const invoiceNumber = (await dialog.locator('strong').first().innerText()).trim();
    expect(invoiceNumber.length).toBeGreaterThan(0);

    // Line items rendered (not the empty "no billable time" state).
    await expect(dialog.getByText(/no billable time was found/i)).toHaveCount(0);
    await expect(dialog.getByText('Description')).toBeVisible();

    // Total > 0.
    const totalText = await dialog
      .locator('div.font-semibold')
      .filter({hasText: 'Total'})
      .innerText();
    const totalValue = Number(totalText.replace(/[^0-9.]/g, ''));
    expect(totalValue).toBeGreaterThan(0);

    // Close the generate modal — the draft now shows in the invoice list.
    await dialog.getByRole('button', {name: /^done$/i}).click();
    const row = page.getByRole('row', {name: new RegExp(invoiceNumber)});
    await expect(row).toBeVisible();
    await expect(row.getByText('draft')).toBeVisible();

    // MARK AS SENT.
    await row.getByRole('button').click();
    await page.getByRole('menuitem', {name: /mark as sent/i}).click();
    await expect(row.getByText('sent')).toBeVisible();

    // MARK AS PAID.
    await row.getByRole('button').click();
    await page.getByRole('menuitem', {name: /mark as paid/i}).click();
    await expect(row.getByText('paid')).toBeVisible();

    // EXPORT PDF — a real client-side download named after the invoice number.
    await row.getByRole('button').click();
    const viewPdf = page.getByRole('menuitem', {name: /view pdf/i});
    await expect(viewPdf).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent('download'), viewPdf.click()]);
    expect(download.suggestedFilename()).toContain(invoiceNumber);

    // CSV: not offered in the client-invoice menu in this build (see header note).
    const csvControl = page.getByRole('menuitem', {name: /csv/i});
    const csvVisible = await csvControl.isVisible().catch(() => false);
    test.info().annotations.push({
      type: 'note',
      description: `CSV export control present in client-invoice menu: ${csvVisible} (expected false in this build)`,
    });
  });
});
