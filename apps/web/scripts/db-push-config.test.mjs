import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

test('db:push chains drizzle-kit push and RLS apply', async () => {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const dbPushScript = packageJson.scripts?.['db:push'];

  assert.equal(typeof dbPushScript, 'string');
  assert.match(dbPushScript, /drizzle-kit push/);
  assert.match(dbPushScript, /db:rls:apply/);
});

test('drizzle.config.ts uses DRIZZLE_DATABASE_URL and defineConfig', async () => {
  const drizzleConfigPath = path.resolve(process.cwd(), 'drizzle.config.ts');
  const drizzleConfig = await readFile(drizzleConfigPath, 'utf8');

  assert.match(drizzleConfig, /defineConfig/);
  assert.match(drizzleConfig, /DRIZZLE_DATABASE_URL/);
  assert.match(drizzleConfig, /dialect:\s*'postgresql'/);
});
