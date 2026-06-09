import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';

import {DEFAULT_RLS_SQL_PATH, requireDatabaseUrl} from './apply-rls-policies.mjs';

test('requireDatabaseUrl returns the DATABASE_URL value', () => {
  const url = requireDatabaseUrl({DATABASE_URL: 'postgres://example'});
  assert.equal(url, 'postgres://example');
});

test('requireDatabaseUrl throws when DATABASE_URL is missing', () => {
  assert.throws(() => requireDatabaseUrl({}), /DATABASE_URL is required to apply RLS policies/);
});

test('DEFAULT_RLS_SQL_PATH points to the canonical policy file', () => {
  const expectedSuffix = path.join('lib', 'db', 'migrations', 'rls_policies.sql');
  assert.equal(DEFAULT_RLS_SQL_PATH.endsWith(expectedSuffix), true);
});
