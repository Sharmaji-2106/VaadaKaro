import { cache } from 'react';
import { cookies } from 'next/headers';
import { TOKEN_COOKIE } from './api/config';
import { serverApi } from './api/server';
import { readToken } from './token';

export interface SessionUser {
  id: string;
  name: string | null;
  email: string;
  phone?: string | null;
  role: 'CITIZEN' | 'OFFICER' | 'LAWYER' | 'ADMIN';
  department?: string | null;
  location?: string | null;
  /** Consent to send their text to the AI provider; null if never asked. */
  aiConsent?: boolean | null;
  /** The current privacy notice hasn't been shown to this person yet. */
  needsNotice?: boolean;
}

/**
 * The signed-in user, loaded from the backend once per request.
 * Returns null when there is no valid token or the API rejects it.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!readToken(token)) return null;
  const res = await serverApi<SessionUser>('/auth/me');
  return res.ok ? res.data : null;
});
