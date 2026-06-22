/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the @masterpokedex/api server, no trailing slash. */
  readonly VITE_API_URL?: string;
  /** Supabase project URL (https://<ref>.supabase.co). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon/publishable key — safe to expose to the browser. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
