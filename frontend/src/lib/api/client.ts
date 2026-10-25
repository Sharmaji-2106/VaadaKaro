import { errorMessage } from './config';

export class ApiError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
  }
}

/**
 * Browser-side call to the backend through this app's /api/v1 proxy, which attaches
 * the user's token from the httpOnly cookie. Throws ApiError on non-2xx responses.
 */
export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      ...rest,
      headers: { ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0, null);
  }

  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const message = res.status === 401 ? 'Unauthorized' : errorMessage(body);
    throw new ApiError(message, res.status, body);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Builds a query string, skipping empty values. */
export function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}
