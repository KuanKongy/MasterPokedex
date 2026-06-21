/**
 * Two connection strings, deliberately.
 *
 * DATABASE_URL        — Supavisor *transaction* pooler, port 6543. Used by the
 *                       running API. Transaction mode does not support prepared
 *                       statements, hence `prepare: false` in client.ts.
 *
 * DIRECT_DATABASE_URL — direct connection, port 5432. Used only by drizzle-kit
 *                       migrations and the ETL seed. Running migrations through
 *                       the pooler hangs, and COPY streams want a real session.
 *
 * Session mode (pooler on 5432) is deliberately not used anywhere. It is only
 * a fallback for migrations from an IPv4-only network without Supabase's IPv4
 * add-on, since direct connections are IPv6-only.
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Loads the repo-root `.env` regardless of the working directory.
 *
 * Needed because `bun run --filter` sets cwd to the package, and drizzle-kit
 * runs under Node — so neither Bun's automatic `.env` loading nor a cwd-relative
 * lookup finds the file. Walks up from this module until it hits one.
 *
 * Variables already present in the environment always win, so
 * `DATABASE_URL=... bun run db:seed` still overrides the file.
 */
let envLoaded = false;
export function loadEnvFile(): void {
  if (envLoaded) return;
  envLoaded = true;

  let dir = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate)) {
      const preexisting = { ...process.env };
      try {
        process.loadEnvFile(candidate);
      } catch {
        return; // malformed or unreadable — fall back to the ambient environment
      }
      for (const [key, value] of Object.entries(preexisting)) {
        if (value !== undefined) process.env[key] = value;
      }
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

export function requireEnv(name: string): string {
  loadEnvFile();
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.example to .env and fill it in — see packages/db/src/env.ts for what each URL is for.`,
    );
  }
  return value;
}

export function optionalEnv(name: string, fallback: string): string {
  loadEnvFile();
  const value = process.env[name];
  return value && value.trim() !== '' ? value : fallback;
}

/** Guards against the single most common misconfiguration in this stack. */
export function assertPoolerUrl(url: string): void {
  if (url.includes(':5432') && url.includes('pooler.supabase.com')) {
    throw new Error(
      'DATABASE_URL points at the pooler on port 5432 (session mode). ' +
        'Use port 6543 (transaction mode) for the API runtime.',
    );
  }
}

export function assertDirectUrl(url: string): void {
  if (url.includes(':6543')) {
    throw new Error(
      'DIRECT_DATABASE_URL points at port 6543 (transaction pooler). ' +
        'Migrations and COPY hang through the pooler — use the direct connection on port 5432.',
    );
  }
}
