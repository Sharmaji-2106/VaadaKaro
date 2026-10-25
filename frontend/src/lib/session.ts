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
