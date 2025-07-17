import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasToken = request.cookies.has('firebase-auth-token')

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  
  // Let the client-side handle the root path redirection
  if (pathname === '/') {
    return NextResponse.next();
  }

  // If user is not authenticated, redirect to login page.
  if (!hasToken && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is authenticated and tries to access an auth page, redirect to dashboard.
  if (hasToken && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

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
