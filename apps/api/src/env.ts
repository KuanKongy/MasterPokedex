import { z } from 'zod';
import { loadEnvFile } from '@masterpokedex/db';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(8787),

  /** Supavisor transaction pooler, port 6543. See packages/db/src/env.ts. */
  DATABASE_URL: z.string().min(1),

  /** Project URL, e.g. https://abcdefgh.supabase.co — used to locate the JWKS. */
  SUPABASE_URL: z.string().url(),

  /**
   * Legacy HS256 projects only. New Supabase projects sign with asymmetric keys
   * published at /auth/v1/.well-known/jwks.json, which needs no shared secret.
   */
  SUPABASE_JWT_SECRET: z.string().optional(),

  /** Comma-separated allowlist. The web app is served cross-origin from GitHub Pages. */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:8080')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  loadEnvFile();
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${missing}\n\nCopy .env.example to .env.`);
  }
  cached = parsed.data;
  return cached;
}
