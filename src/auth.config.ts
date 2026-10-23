import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = (auth?.user as any)?.role;
      const pathname = nextUrl.pathname;

      // Define route groups
      const isPublicRoute = 
        pathname === '/' || 
        pathname === '/login' || 
        pathname === '/signup' || 
        pathname === '/register' || 
        pathname === '/forgot-password' ||
        pathname === '/terms' ||
        pathname === '/privacy' ||
        pathname === '/disclaimer' ||
        pathname.startsWith('/track-complaint') ||
        pathname.startsWith('/ai-assistant') ||
        pathname.startsWith('/find-lawyer') ||
        pathname.startsWith('/book-lawyer') ||
        pathname.startsWith('/dashboard/admin/reports') ||
        pathname.startsWith('/file-complaint');
      const isOfficerRoute = pathname.startsWith('/dashboard/officer') || pathname.startsWith('/officer');
      const isAdminRoute = pathname.startsWith('/dashboard/admin') || pathname.startsWith('/admin');
      const isCitizenRoute = pathname.startsWith('/dashboard') && !isOfficerRoute && !isAdminRoute;
      const isSettingsRoute = pathname.startsWith('/settings');

      if (!isLoggedIn) {
        if (isPublicRoute) return true;
        return false; // Redirect to login
      }

      // Role-based access control
      if (isAdminRoute && role !== 'ADMIN') {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      if (isOfficerRoute && role !== 'OFFICER' && role !== 'ADMIN') {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      if ((isCitizenRoute || isSettingsRoute) && !role) {
        return false;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.department = (user as any).department;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).department = token.department;
      }
      return session;
    },
  },
  providers: [], // Configured in auth.ts
} satisfies NextAuthConfig;
