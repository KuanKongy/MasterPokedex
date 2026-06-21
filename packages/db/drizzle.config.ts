import { defineConfig } from 'drizzle-kit';
import { assertDirectUrl, requireEnv } from './src/env';

/**
 * `generate` only diffs the schema against ./migrations and needs no database,
 * so it must work offline. The commands that actually connect get the strict
 * check — including the guard against pointing migrations at the transaction
 * pooler on 6543, where drizzle-kit hangs rather than failing.
 */
const CONNECTING_COMMANDS = ['migrate', 'push', 'pull', 'studio', 'up', 'check'];
const needsDatabase = process.argv.some((arg) => CONNECTING_COMMANDS.includes(arg));

const url = needsDatabase ? requireEnv('DIRECT_DATABASE_URL') : (process.env.DIRECT_DATABASE_URL ?? '');
if (url) assertDirectUrl(url);

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  dbCredentials: { url },
  schemaFilter: ['public', 'dex'],
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
