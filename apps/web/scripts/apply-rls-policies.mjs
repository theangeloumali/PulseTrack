import {config} from 'dotenv';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import postgres from 'postgres';

config({path: '.env'});

export const DEFAULT_RLS_SQL_PATH = path.resolve(
  process.cwd(),
  'lib/db/migrations/rls_policies.sql',
);

export function requireDatabaseUrl(env = process.env) {
  const databaseUrl = env.DRIZZLE_DATABASE_URL || env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DRIZZLE_DATABASE_URL or DATABASE_URL is required to apply RLS policies');
  }

  return databaseUrl;
}

export async function applyRlsPolicies({databaseUrl, sqlPath = DEFAULT_RLS_SQL_PATH}) {
  const sqlText = await readFile(sqlPath, 'utf8');
  const sql = postgres(databaseUrl, {prepare: false});

  try {
    await sql.unsafe(sqlText);
  } finally {
    await sql.end();
  }
}

async function run() {
  const databaseUrl = requireDatabaseUrl();
  await applyRlsPolicies({databaseUrl});
  console.log('Applied RLS policies from lib/db/migrations/rls_policies.sql');
}

const entryFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
const currentFile = fileURLToPath(import.meta.url);

if (entryFile === currentFile) {
  run().catch((error) => {
    console.error('Failed to apply RLS policies:', error);
    process.exit(1);
  });
}
