/**
 * apply-sql.mjs — apply a raw .sql file to the Supabase DB via DATABASE_URL.
 * Usage: node scripts/apply-sql.mjs lib/db/migrations/0017_users_role_check.sql
 * Loads apps/web/.env. Intended for out-of-band / idempotent SQL (CHECK constraints,
 * RLS, additive DDL) that the drizzle journal doesn't track.
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
  if (i === -1) continue;
  const k = l.slice(0, i).trim();
  const v = l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
  if (!(k in process.env)) process.env[k] = v;
}

const rel = process.argv[2];
if (!rel) {
  console.error('Usage: node scripts/apply-sql.mjs <path-to-.sql>');
  process.exit(1);
}
const file = path.resolve(__dirname, '..', rel);
const sqlText = readFileSync(file, 'utf8');
const sql = postgres(process.env.DRIZZLE_DATABASE_URL || process.env.DATABASE_URL, {prepare: false});

try {
  console.log(`Applying ${rel} ...`);
  await sql.unsafe(sqlText);
  console.log('Applied OK.');
} catch (e) {
  console.error('Apply FAILED:', e.message);
  process.exitCode = 1;
} finally {
  await sql.end({timeout: 5});
}
