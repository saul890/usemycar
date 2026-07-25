'use client'
// login/page.tsx — email + password sign-in form.
// 'use client' is required because this page uses React state and event handlers,
// which only work in the browser (not on the server).
// After a successful login we check if the user has completed their profile;
// if not, we send them to /onboarding first.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check whether this user has already filled out their profile.
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', data.user.id)
      .single()

    // router.refresh() tells Next.js to re-fetch server data (the nav, for example).
    router.push(profile?.full_name ? '/browse' : '/onboarding')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500 mb-8">Sign in to Use My Car</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-center text-gray-500">
          No account?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
