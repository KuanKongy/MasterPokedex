/**
 * Runs every test/*.sql suite and reports each assertion. Uses postgres.js
 * rather than shelling out to psql so it works anywhere Node does, including
 * CI images without the Postgres client installed.
 */
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import postgres from 'postgres';
import { assertDirectUrl, requireEnv } from '../src/env';

const here = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(here, '..', 'test');

const url = requireEnv('DIRECT_DATABASE_URL');
assertDirectUrl(url);

let passed = 0;
const failures: string[] = [];

const sql = postgres(url, {
  max: 1,
  onnotice: (notice) => {
    const message = notice.message ?? '';
    if (message.startsWith('PASS')) {
      passed += 1;
      console.log(`  \x1b[32m✓\x1b[0m ${message.replace(/^PASS\s+/, '')}`);
    } else if (message.startsWith('FAIL')) {
      failures.push(message);
      console.log(`  \x1b[31m✗\x1b[0m ${message}`);
    }
  },
});

const suites = (await readdir(TEST_DIR)).filter((f) => f.endsWith('.sql')).sort();

for (const suite of suites) {
  console.log(`\n\x1b[1m${suite.replace(/^verify-|\.sql$/g, '')}\x1b[0m`);
  try {
    const script = await readFile(join(TEST_DIR, suite), 'utf8');
    await sql.unsafe(script);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    failures.push(`${suite}: ${message}`);
    console.error(`  \x1b[31m✗ aborted:\x1b[0m ${message}`);
    // The suite runs in a transaction that just aborted; clear it before the next.
    await sql.unsafe('ROLLBACK').catch(() => {});
  }
}

await sql.end({ timeout: 5 });

if (failures.length > 0) {
  console.error(`\n\x1b[31m${failures.length} assertion(s) failed\x1b[0m (${passed} passed)\n`);
  process.exit(1);
}

console.log(`\n\x1b[32mAll ${passed} assertions passed\x1b[0m\n`);
