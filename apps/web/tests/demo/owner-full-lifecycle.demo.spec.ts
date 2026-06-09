import {expect, test} from '@playwright/test';
import {loginAs} from '../e2e/fixtures/accounts';
import {
  glanceHeading,
  humanClick,
  installCursor,
  navTo,
  scenePause,
  smoothMoveTo,
  typeInto,
} from './cursor';

/**
 * ONE continuous owner walkthrough → one video.
 *
 * admin@pulsetrack.demo (company_admin / ZKidz Studio) drives the full
 * lifecycle: log in → dashboard → create a project → open a client →
 * generate an invoice from billable time → show the invoice PDF action →
 * billing exports → tickets board (create a ticket) → time tracking.
 *
 * Title is intentionally descriptive so the recorded folder/filename reads
 * as a real demo asset.
 */
test.describe('PulseTrack owner demo', () => {
  test('Owner full lifecycle - projects, clients, invoicing, tickets, time', async ({page}) => {
    const stamp = Date.now().toString().slice(-5);
    const projectName = `Demo Launch ${stamp}`;
    const ticketTitle = `Polish onboarding flow ${stamp}`;

    await installCursor(page);

    // ── Scene 1: Sign in as the owner ──────────────────────────────────────
    await loginAs(page, 'admin@pulsetrack.demo');
    await glanceHeading(page, /welcome back/i);
    await smoothMoveTo(page, 720, 420);
    await scenePause(page, 1200);

    // ── Scene 2: Projects → create a new project ───────────────────────────
    await navTo(page, 'Projects');
    await glanceHeading(page, /projects/i);
    await scenePause(page, 900);

    await humanClick(page.getByRole('button', {name: 'New Project'}).first());
    const projectDialog = page.getByRole('dialog');
    await expect(projectDialog.getByText(/create new project/i)).toBeVisible();
    await scenePause(page, 700);

    await typeInto(projectDialog.getByLabel(/project name/i), projectName);
    await scenePause(page, 700);
    await humanClick(projectDialog.getByRole('button', {name: /create project/i}));
    await expect(projectDialog)
      .toBeHidden({timeout: 20_000})
      .catch(() => undefined);
    await scenePause(page, 1200);

    // ── Scene 3: Clients → open Acme Corp ──────────────────────────────────
    await navTo(page, 'Clients');
    await glanceHeading(page, /clients/i);
    await scenePause(page, 900);
    await humanClick(page.getByText('Acme Corp', {exact: false}).first());
    await page.waitForURL(/\/clients\/.+/).catch(() => undefined);
    await scenePause(page, 1200);

    // ── Scene 4: Generate an invoice from billable time ────────────────────
    await humanClick(page.getByRole('button', {name: /generate invoice/i}));
    const invoiceDialog = page.getByRole('dialog');
    await expect(invoiceDialog.getByText(/generate invoice/i)).toBeVisible();
    await scenePause(page, 1000);
    // Period defaults to last month; tax stays at 0 — just generate the draft.
    await humanClick(invoiceDialog.getByRole('button', {name: /generate draft/i}));
    await expect(invoiceDialog.getByText(/created\./i)).toBeVisible({timeout: 30_000});
    await scenePause(page, 1400);
    await humanClick(invoiceDialog.getByRole('button', {name: /^done$/i}));
    await scenePause(page, 900);

    // ── Scene 5: Show the invoice's PDF action (row actions menu) ───────────
    const rowMenu = page.locator('button[aria-haspopup="menu"]').first();
    await humanClick(rowMenu);
    await scenePause(page, 800);
    await page
      .getByRole('menuitem', {name: /view pdf/i})
      .first()
      .hover()
      .catch(() => undefined);
    await scenePause(page, 1200);
    await page.keyboard.press('Escape');
    await scenePause(page, 700);

    // ── Scene 6: Billing exports (PDF / data export affordances) ───────────
    await navTo(page, 'Billing');
    await glanceHeading(page, /billing/i);
    await scenePause(page, 900);
    const exportBtn = page.getByRole('button', {name: /export/i}).first();
    if (await exportBtn.isVisible().catch(() => false)) {
      await exportBtn.hover();
      await scenePause(page, 1200);
    }

    // ── Scene 7: Tickets board → create a ticket ───────────────────────────
    await navTo(page, 'Tickets');
    await glanceHeading(page, /tickets/i);
    const boardToggle = page.getByRole('button', {name: /board/i}).first();
    if (await boardToggle.isVisible().catch(() => false)) {
      await humanClick(boardToggle);
    }
    await scenePause(page, 900);
    await page
      .getByText('In Progress', {exact: false})
      .first()
      .hover()
      .catch(() => undefined);
    await scenePause(page, 900);

    await humanClick(page.getByRole('button', {name: /create ticket/i}).first());
    const ticketDialog = page.getByRole('dialog');
    await expect(ticketDialog.getByText(/create new ticket/i)).toBeVisible();
    await scenePause(page, 700);
    // Project is required — pick the first real project from the native select.
    await ticketDialog.locator('#project_id').selectOption({index: 1});
    await scenePause(page, 600);
    await typeInto(ticketDialog.getByLabel(/^title/i), ticketTitle);
    await scenePause(page, 700);
    await humanClick(ticketDialog.getByRole('button', {name: /create ticket/i}));
    await expect(ticketDialog)
      .toBeHidden({timeout: 20_000})
      .catch(() => undefined);
    await scenePause(page, 1400);

    // ── Scene 8: Time tracking glance — closes the lifecycle ───────────────
    await navTo(page, 'Time Tracking');
    await glanceHeading(page, /time tracking/i);
    await smoothMoveTo(page, 700, 460);
    await scenePause(page, 1600);
  });
});
