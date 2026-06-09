/**
 * seed-hot-client.mjs — make Acme Corp a HOT client so the heat map shows
 * red/amber/green tiers for the demo. Idempotent, tagged '[demo-hot]'.
 * Adds an overdue invoice + flips a few of Acme's tickets to overdue/open.
 * Teardown: node scripts/seed-hot-client.mjs --teardown
 */
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const raw of readFileSync(path.resolve(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) {
  const l = raw.trim();
  if (!l || l.startsWith('#')) continue;
  const i = l.indexOf('=');
  if (i < 0) continue;
  const k = l.slice(0, i).trim();
  const v = l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  if (!(k in process.env)) process.env[k] = v;
}
const sql = postgres(process.env.DRIZZLE_DATABASE_URL || process.env.DATABASE_URL, {prepare: false});
const TAG = '[demo-hot]';
const teardown = process.argv.includes('--teardown');

try {
  const [co] = await sql`SELECT id FROM companies WHERE slug = 'zkidz-studio' LIMIT 1`;
  if (!co) throw new Error('ZKidz Studio company not found — run seed-demo first');
  const [acme] = await sql`SELECT id FROM clients WHERE company_id = ${co.id} AND name = 'Acme Corp' LIMIT 1`;
  if (!acme) throw new Error('Acme Corp client not found');

  if (teardown) {
    const inv = await sql`DELETE FROM client_invoices WHERE client_id = ${acme.id} AND notes = ${TAG} RETURNING id`;
    await sql`UPDATE tickets SET due_date = NULL WHERE project_id IN (SELECT id FROM projects WHERE client_id = ${acme.id}) AND status = 'in_progress'`;
    console.log(`Teardown: removed ${inv.length} hot invoice(s); cleared overdue due_dates.`);
  } else {
    // 1) Overdue invoice ($8,500, due 20 days ago)
    const existing = await sql`SELECT id FROM client_invoices WHERE client_id = ${acme.id} AND notes = ${TAG} LIMIT 1`;
    if (!existing.length) {
      await sql`
        INSERT INTO client_invoices
          (company_id, client_id, invoice_number, status, issue_date, due_date, period_start, period_end, subtotal, tax_rate, tax_amount, total, currency, notes)
        VALUES
          (${co.id}, ${acme.id}, 'INV-HOT-0001', 'overdue',
           (now() - interval '50 days')::date, (now() - interval '20 days')::date,
           (now() - interval '80 days')::date, (now() - interval '50 days')::date,
           8500, 0, 0, 8500, 'USD', ${TAG})
      `;
      console.log('Created overdue invoice INV-HOT-0001 ($8,500).');
    } else {
      console.log('Overdue invoice already present (idempotent).');
    }

    // 2) Flip up to 3 of Acme's tickets to overdue + open (past due_date, in_progress)
    const flipped = await sql`
      UPDATE tickets SET due_date = (now() - interval '7 days'), status = 'in_progress'
      WHERE id IN (
        SELECT t.id FROM tickets t
        JOIN projects p ON p.id = t.project_id
        WHERE p.client_id = ${acme.id} AND t.deleted_at IS NULL
        ORDER BY t.created_at LIMIT 3
      )
      RETURNING id`;
    console.log(`Flipped ${flipped.length} Acme tickets to overdue/in_progress.`);
  }
} catch (e) {
  console.error('seed-hot-client failed:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end({timeout: 5});
}
