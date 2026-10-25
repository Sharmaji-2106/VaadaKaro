import { NextRequest, NextResponse } from 'next/server';
import { TOKEN_COOKIE } from '@/lib/api/config';
import { readToken } from '@/lib/token';

// Pages that need a signed-in user. Everything else is public.
const PROTECTED_PREFIXES = ['/dashboard', '/generate-docs', '/draft-letter', '/settings'];
const OFFICER_PREFIXES = ['/dashboard/officer'];
const ADMIN_PREFIXES = ['/dashboard/admin'];
const AUTH_PAGES = ['/login', '/signup'];

const startsWithAny = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const claims = readToken(req.cookies.get(TOKEN_COOKIE)?.value);

  if (!claims && startsWithAny(pathname, PROTECTED_PREFIXES)) {
    const login = new URL('/login', req.url);
    login.searchParams.set('callbackUrl', pathname + req.nextUrl.search);
    const res = NextResponse.redirect(login);
    res.cookies.delete(TOKEN_COOKIE);
    return res;
  }

  if (claims) {
    if (startsWithAny(pathname, AUTH_PAGES)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    if (startsWithAny(pathname, ADMIN_PREFIXES) && claims.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    if (startsWithAny(pathname, OFFICER_PREFIXES) && claims.role !== 'OFFICER' && claims.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Skip the API proxy, Next internals and static files.
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf)$).*)'],
};
