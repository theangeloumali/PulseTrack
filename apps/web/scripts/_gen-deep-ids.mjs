/** Writes real IDs for the deep-pages E2E to tests/e2e/.deep-ids.json. */
import {readFileSync, writeFileSync} from 'node:fs';
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

const [co] = await sql`SELECT id FROM companies WHERE slug = 'zkidz-studio' LIMIT 1`;
const [pt] = await sql`
  SELECT p.id AS project_id, t.id AS ticket_id
  FROM projects p JOIN tickets t ON t.project_id = p.id
  WHERE p.company_id = ${co.id} AND t.deleted_at IS NULL
  ORDER BY t.created_at DESC LIMIT 1`;
const [client] = await sql`SELECT id FROM clients WHERE company_id = ${co.id} AND name = 'Acme Corp' LIMIT 1`;

const ids = {
  companyId: co.id,
  projectId: pt.project_id,
  ticketId: pt.ticket_id,
  clientId: client.id,
};
writeFileSync(path.resolve(__dirname, '..', 'tests/e2e/.deep-ids.json'), JSON.stringify(ids, null, 2));
console.log('deep ids:', ids);
await sql.end({timeout: 5});
