/**
 * Reads the claims of the backend's JWT without verifying the signature.
 *
 * Used only to decide which pages to show (middleware, layouts). Every API call is
 * still authenticated and authorised by the backend, so a forged token gains nothing.
 * Works in both the Edge (middleware) and Node runtimes.
 */
export interface TokenClaims {
  sub: string;
  role: 'CITIZEN' | 'OFFICER' | 'LAWYER' | 'ADMIN';
  exp: number;
}

export function readToken(token: string | undefined | null): TokenClaims | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const claims = JSON.parse(atob(padded)) as TokenClaims;
    if (!claims.sub || !claims.exp || claims.exp * 1000 <= Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}
