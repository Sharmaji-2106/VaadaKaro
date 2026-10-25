import { cookies, headers as requestHeaders } from 'next/headers';
import { API_URL, TOKEN_COOKIE, errorMessage } from './config';
import { clientIpHeaders } from './forwarding';

export interface ServerResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

/**
 * Server-side call straight to the backend (server components, server actions).
 * Never throws: network failures come back as { ok: false, status: 0 } so a page
 * can still render when the API is down.
 */
export async function serverApi<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<ServerResult<T>> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  const forwarding = clientIpHeaders(await requestHeaders());
  const { json, headers, ...rest } = init;

  try {
    const res = await fetch(`${API_URL}/api/v1${path}`, {
      ...rest,
      cache: 'no-store',
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...forwarding,
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) return { ok: false, status: res.status, data: null, error: errorMessage(body) };
    return { ok: true, status: res.status, data: body as T };
  } catch (err) {
    console.error(`[serverApi] ${path} failed:`, err);
    return { ok: false, status: 0, data: null, error: 'The VaadaKaro service is unavailable right now.' };
  }
}
