import type { ErrorCode } from '@masterpokedex/shared';
import { supabase } from './supabase';

/**
 * Typed client for our own API. Every response type comes from
 * @masterpokedex/shared, so the web app and the server cannot drift apart
 * without the compiler noticing.
 */

const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export class ApiClientError extends Error {
  constructor(
    readonly code: ErrorCode | (string & {}),
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export function isApiError(err: unknown, code?: ErrorCode): err is ApiClientError {
  return err instanceof ApiClientError && (code === undefined || err.code === code);
}

type FetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /**
   * true — the endpoint needs a signed-in user; fails fast without a session.
   * 'optional' — attach the token when there is one (e.g. trainer directory,
   * where being signed in shapes friendshipStatus but is not required).
   */
  auth?: true | 'optional';
};

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};

  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  if (options.auth) {
    // Read the session per request rather than caching the token in a module:
    // supabase-js rotates the access token roughly hourly.
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else if (options.auth === true) {
      throw new ApiClientError('unauthorized', 'You need to sign in first', 401);
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiClientError('upstream_unavailable', 'Could not reach the server', 503);
  }

  if (response.status === 204) return undefined as T;

  const json = (await response.json().catch(() => null)) as
    | { error?: { code?: string; message?: string; details?: unknown } }
    | null;

  if (!response.ok) {
    throw new ApiClientError(
      json?.error?.code ?? 'internal',
      json?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      json?.error?.details,
    );
  }

  return json as T;
}
