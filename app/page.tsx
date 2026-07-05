// page.tsx — the home page (/).
// It doesn't render anything itself; it just figures out where to send the user:
//  • Not logged in → /login
//  • Logged in but no profile yet → /onboarding
//  • Logged in with a complete profile → /browse
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.full_name) {
    redirect('/onboarding')
  }

  redirect('/browse')
}
