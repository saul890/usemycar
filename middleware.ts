// middleware.ts — runs on the server before every page renders.
// Two jobs:
//  1. Refresh the Supabase session token so users stay logged in automatically.
//  2. Redirect unauthenticated users away from pages that require a login.
//
// The session refresh MUST happen here (not in individual pages) because
// only middleware can both read AND write cookies on the same request.
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Start with a "pass-through" response that we'll attach refreshed cookies to.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Write refreshed session cookies onto both the request and response.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This call refreshes the session — do not remove it.
  const { data: { user } } = await supabase.auth.getUser()

  // Pages that work without being logged in.
  const publicPaths = ['/login', '/signup', '/auth', '/forgot-password', '/reset-password']
  const isPublic = publicPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

// Run middleware on all routes except Next.js internals and static files.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
