import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from './lib/firebase';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')

  // The / page is handled by client-side logic in page.tsx now
  if (pathname === '/') {
    return NextResponse.next();
  }
  
  // Client-side auth context now handles redirecting unauthenticated users from protected pages
  // and authenticated users from auth pages. Middleware can be simplified.
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
