// components/Nav.tsx — the navigation bar shown on every page.
// This is an async Server Component: it runs on the server, reads the user's
// session from cookies, and renders different links depending on whether
// they're logged in. No JavaScript is sent to the browser for this component.
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from './SignOutButton'

export default async function Nav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="sticky top-0 z-10 bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* App name / logo */}
        <Link href="/" className="font-semibold text-gray-900 tracking-tight">
          UseMyCar
        </Link>

        {/* Right-side links */}
        <div className="flex items-center gap-5">
          <Link href="/browse" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Browse
          </Link>

          {user ? (
            <>
              <Link href="/residents" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Residents
              </Link>
              <Link href="/profile" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Profile
              </Link>
              <Link
                href="/cars/new"
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                List your car
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
