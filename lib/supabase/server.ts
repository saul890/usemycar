// lib/supabase/server.ts — server-side Supabase client.
// Use this in Server Components, Route Handlers, and Server Actions.
// It reads the user's session from HTTP cookies (managed by the middleware).
// The try/catch in setAll is intentional: Server Components can't set cookies —
// only the middleware can. We let middleware handle session refreshes.
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Expected in Server Components — middleware handles cookie refresh.
          }
        },
      },
    }
  )
}
