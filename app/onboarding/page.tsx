'use client'
// onboarding/page.tsx — profile completion step shown right after signing up.
// Collects the user's name, address (→ building), unit number, and an
// optional profile photo.
// Steps:
//  1. (Optional) Upload photo → stored in Supabase Storage "avatars" bucket.
//  2. Get the public URL of the uploaded photo.
//  3. Resolve the picked address to a building_id via find_or_create_building.
//  4. Save name + building_id + unit + photo URL to the "profiles" table.
//  5. Redirect to /browse.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import AddressAutocomplete, { type SelectedAddress } from '@/components/AddressAutocomplete'

export default function OnboardingPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState<SelectedAddress | null>(null)
  const [unitNumber, setUnitNumber] = useState('')
  const [phone, setPhone] = useState('')
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

    if (!address) {
      setError('Please select your address from the suggestions.')
      return
    }

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Resolve the picked address to a building row (creating one if this is
    // the first resident from that building) before saving the profile.
    const { data: buildingId, error: buildingError } = await supabase.rpc('find_or_create_building', {
      p_place_id: address.placeId,
      p_formatted: address.formatted,
      p_lat: address.lat,
      p_lon: address.lon,
    })

    if (buildingError) {
      setError('Could not save your address. Please try again.')
      setLoading(false)
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
      building_id: buildingId,
      unit_number: unitNumber,
      phone: phone || null,
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
                <User className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
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

          <AddressAutocomplete id="address" label="Address" onSelect={setAddress} />

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

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0400 000 000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-400">
              Only shown to neighbours who click into a car you've listed — optional, but they'll need a way to reach you.
            </p>
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
