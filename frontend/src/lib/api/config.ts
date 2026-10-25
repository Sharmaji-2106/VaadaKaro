/** Where the FastAPI backend lives. Only read on the server (route handlers, server components, actions). */
export const API_URL = (process.env.API_URL || 'http://localhost:8000').replace(/\/$/, '');

/** httpOnly cookie that holds the backend's JWT access token. */
export const TOKEN_COOKIE = 'vk_token';

/** Turns any FastAPI error body into one readable sentence. */
export function errorMessage(body: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    // Pydantic validation errors: [{ loc: [...], msg: "..." }]
    const first = detail[0] as { msg?: string; loc?: (string | number)[] };
    const field = first.loc?.[first.loc.length - 1];
    const msg = (first.msg || '').replace(/^Value error, /, '');
    return field && typeof field === 'string' ? `${msg} (${field})` : msg || fallback;
  }
  if (detail && typeof detail === 'object' && 'message' in detail) {
    return String((detail as { message: unknown }).message);
  }
  return fallback;
}
