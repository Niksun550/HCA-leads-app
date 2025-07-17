import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasToken = request.cookies.has('firebase-auth-token')

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  
  // If user is not authenticated and tries to access a protected page (but not the root)
  if (!hasToken && !isAuthPage && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If user is authenticated and tries to access an auth page
  if (hasToken && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // The root path '/' is now handled by the client-side component in src/app/page.tsx
  // to avoid middleware/client-side race conditions during auth check.
  if (pathname === '/') {
    // Let the page component handle the redirect.
    return NextResponse.next();
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
