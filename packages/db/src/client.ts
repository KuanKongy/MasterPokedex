import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { assertDirectUrl, assertPoolerUrl, optionalEnv, requireEnv } from './env';

export type Database = ReturnType<typeof createDb>;

/**
 * Runtime client. Points at the Supavisor **transaction** pooler on port 6543.
 *
 * `prepare: false` is not optional there. Transaction mode hands a different
 * backend connection to each transaction, so a prepared statement created on
 * one is invisible to the next — the symptom is "prepared statement \"s1\"
 * already exists" errors that appear only under concurrency in production and
 * never once in local development.
 */
export function createDb(url = requireEnv('DATABASE_URL')) {
  assertPoolerUrl(url);

  const sql = postgres(url, {
    prepare: false,
    max: Number(optionalEnv('DB_POOL_MAX', '10')),
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });

  return drizzle(sql, { schema, casing: 'snake_case' });
}

/**
 * Direct-connection client for migrations, COPY streams, and anything else that
 * needs a real session. Never used to serve a request.
 */
export function createDirectClient(url = requireEnv('DIRECT_DATABASE_URL')) {
  assertDirectUrl(url);

  return postgres(url, {
    max: 1,
    idle_timeout: 0,
    connect_timeout: 30,
    onnotice: () => {},
  });
}
