// auth/callback/route.ts — handles the redirect after email confirmation.
// When Supabase sends a confirmation email, the link points here with a
// one-time `code` in the URL. We exchange that code for a real session,
// then send the user to the onboarding page to complete their profile.
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could+not+confirm+your+account`)
}
