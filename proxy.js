import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = 'admin-portal-secret-key-2026-super-secure';
const key = new TextEncoder().encode(secretKey);

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/login',
];

function isPublicRoute(pathname) {
  // Exact match for root
  if (pathname === '/') return true;
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Allow public routes through
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for the session cookie
  const token = request.cookies.get('admin_session')?.value;

  if (!token) {
    // For API routes, return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }
    // For page routes, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify the JWT token
  try {
    await jwtVerify(token, key);
    return NextResponse.next();
  } catch (error) {
    // Token is invalid or expired — clear the bad cookie
    const response = pathname.startsWith('/api/')
      ? NextResponse.json(
          { error: 'Session expired. Please log in again.' },
          { status: 401 }
        )
      : NextResponse.redirect(new URL('/login', request.url));

    response.cookies.delete('admin_session');
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
