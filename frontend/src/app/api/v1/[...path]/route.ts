import { NextRequest, NextResponse } from 'next/server';
import { API_URL, TOKEN_COOKIE } from '@/lib/api/config';
import { clientIpHeaders } from '@/lib/api/forwarding';

/**
 * Same-origin proxy to the backend. The browser never sees the JWT: it lives in an
 * httpOnly cookie, and this handler forwards it as a Bearer token.
 */
async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = `${API_URL}/api/v1/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
  const token = req.cookies.get(TOKEN_COOKIE)?.value;

  const headers = new Headers(clientIpHeaders(req.headers));
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer(),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ detail: 'The VaadaKaro service is unavailable right now.' }, { status: 502 });
  }

  const responseHeaders = new Headers();
  for (const name of ['content-type', 'content-disposition', 'retry-after']) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  const response = new NextResponse(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
  // An expired or revoked token: drop the cookie so the UI shows the signed-out state.
  if (upstream.status === 401 && token) response.cookies.delete(TOKEN_COOKIE);
  return response;
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
