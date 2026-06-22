import { createClient } from '@supabase/supabase-js';

/**
 * One client for the whole app. Supabase handles session persistence
 * (localStorage) and token refresh itself; everything else — profile, teams,
 * bag, friends — goes through our own API, which verifies the JWT against the
 * project's JWKS. The anon/publishable key is safe to ship in the bundle.
 *
 * The fallbacks keep the public pages rendering when auth isn't configured
 * yet (fresh checkout without a .env): sign-in will fail, the dex won't.
 */
const url = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key-not-configured';

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('[auth] VITE_SUPABASE_URL is not set — sign-in is disabled until .env is configured.');
}

export const supabase = createClient(url, anonKey);
