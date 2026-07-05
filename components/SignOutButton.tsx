'use client'
// components/SignOutButton.tsx — a Client Component because it needs an onClick handler.
// The Nav (a Server Component) can't handle browser events directly, so it
// delegates just the sign-out button to this small client component.

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
    >
      Sign out
    </button>
  )
}
