'use client'
// profile/page.tsx — lets an existing resident edit their name, address,
// unit number, and photo after onboarding.
// Address behaviour: the field starts pre-filled with the resident's current
// building address. If they never touch it, their building_id is left alone
// on save. If they type in it, they must pick a new suggestion before saving
// (same "must select, not free-type" rule as onboarding) — that new address
// is resolved to a (possibly new) building via find_or_create_building.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AddressAutocomplete, { type SelectedAddress } from '@/components/AddressAutocomplete'

export default function ProfilePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [unitNumber, setUnitNumber] = useState('')
  const [currentAddress, setCurrentAddress] = useState('')
  const [buildingId, setBuildingId] = useState<string | null>(null)
  const [newAddress, setNewAddress] = useState<SelectedAddress | null>(null)
  const [addressTouched, setAddressTouched] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, unit_number, avatar_url, building_id, buildings (formatted_address)')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name ?? '')
        setUnitNumber(profile.unit_number ?? '')
        setAvatarPreview(profile.avatar_url ?? null)
        setBuildingId(profile.building_id ?? null)
        setCurrentAddress((profile.buildings as { formatted_address: string } | null)?.formatted_address ?? '')
      }
      setInitialLoading(false)
    }

    loadProfile()
  }, [router])

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (addressTouched && !newAddress) {
      setError('Please select your address from the suggestions.')
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    let resolvedBuildingId = buildingId

    if (addressTouched && newAddress) {
      const { data, error: buildingError } = await supabase.rpc('find_or_create_building', {
        p_place_id: newAddress.placeId,
        p_formatted: newAddress.formatted,
        p_lat: newAddress.lat,
        p_lon: newAddress.lon,
      })
      if (buildingError) {
        setError('Could not save your address. Please try again.')
        setLoading(false)
        return
      }
      resolvedBuildingId = data
    }

    let avatarUrl = avatarPreview

    if (avatarFile && userId) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${userId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })

      if (uploadError) {
        setError('Photo upload failed — you can try again.')
        setLoading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      avatarUrl = urlData.publicUrl
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      building_id: resolvedBuildingId,
      unit_number: unitNumber,
      avatar_url: avatarUrl,
    })

    setLoading(false)

    if (profileError) {
      setError('Could not save your profile. Please try again.')
      return
    }

    setBuildingId(resolvedBuildingId)
    if (addressTouched && newAddress) {
      setCurrentAddress(newAddress.formatted)
      setAddressTouched(false)
      setNewAddress(null)
    }
    setMessage('Profile updated.')
    router.refresh()
  }

  if (initialLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-white" />
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-white">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Your profile</h1>
        <p className="text-sm text-gray-500 mb-8">Update your details or move to a new building.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <label className="cursor-pointer text-sm text-blue-600 hover:underline font-medium">
              {avatarPreview ? 'Change photo' : 'Add a photo'}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <AddressAutocomplete
            id="address"
            label="Address"
            initialValue={currentAddress}
            onSelect={address => {
              setNewAddress(address)
              setAddressTouched(true)
            }}
          />

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
          {message && <p className="text-sm text-green-600">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
