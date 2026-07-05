'use client'
// onboarding/page.tsx — profile completion step shown right after signing up.
// Collects the user's name, unit number, and an optional profile photo.
// Steps:
//  1. (Optional) Upload photo → stored in Supabase Storage "avatars" bucket.
//  2. Get the public URL of the uploaded photo.
//  3. Save name + unit + photo URL to the "profiles" table.
//  4. Redirect to /browse.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [unitNumber, setUnitNumber] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    // createObjectURL gives us a temporary local URL for the preview — no upload yet.
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    let avatarUrl: string | null = null

    // Upload the photo if one was chosen.
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      // Name the file after the user's ID so each user only ever has one avatar.
      const path = `${user.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })

      if (uploadError) {
        setError('Photo upload failed — you can add one later.')
        setLoading(false)
        return
      }

      // getPublicUrl constructs the public URL; it never fails.
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      avatarUrl = urlData.publicUrl
    }

    // upsert = insert if the row doesn't exist, update if it does.
    // Safe to call multiple times (e.g., if the user refreshes mid-way).
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      unit_number: unitNumber,
      avatar_url: avatarUrl,
    })

    if (profileError) {
      setError('Could not save your profile. Please try again.')
      setLoading(false)
      return
    }

    router.push('/browse')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Tell us about yourself</h1>
        <p className="text-sm text-gray-500 mb-8">Help your neighbours know who you are.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Profile photo picker */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Your photo preview" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            {/* Hidden file input triggered by the label */}
            <label className="cursor-pointer text-sm text-blue-600 hover:underline font-medium">
              {avatarPreview ? 'Change photo' : 'Add a photo (optional)'}
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              placeholder="Jane Smith"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="unitNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Unit number
            </label>
            <input
              id="unitNumber"
              type="text"
              value={unitNumber}
              onChange={e => setUnitNumber(e.target.value)}
              required
              placeholder="4B"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving…' : 'Save and continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
