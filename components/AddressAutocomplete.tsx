'use client'
// components/AddressAutocomplete.tsx — text input that suggests real addresses
// as you type (via Geoapify) and reports back the one the user picked.
// Reused by onboarding (initial signup) and the profile page (changing address).
//
// Selecting a suggestion is required, not just typing text: onSelect fires
// with a real address when the user picks one, and with null the moment they
// type anything afterwards — so a parent form can block submit until a real
// selection is made, rather than accepting arbitrary free text.
//
// After a selection, it also resolves the building and shows how many other
// residents are already registered there — the only way to tell "I picked
// the right building" from "I probably typo'd this into a new one".

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type SelectedAddress = {
  placeId: string
  formatted: string
  lat: number
  lon: number
}

type Suggestion = {
  place_id: string
  formatted: string
  lat: number
  lon: number
}

export default function AddressAutocomplete({
  id,
  label,
  helperText,
  initialValue = '',
  onSelect,
}: {
  id: string
  label: string
  helperText?: string
  initialValue?: string
  onSelect: (address: SelectedAddress | null) => void
}) {
  const [query, setQuery] = useState(initialValue)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [residentCount, setResidentCount] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Clean up any pending debounced fetch if the component unmounts mid-type.
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)
    // Any edit invalidates a previous selection — the parent form must wait
    // for a fresh pick before it can be considered a real address again.
    onSelect(null)
    setResidentCount(null)
    setCountLoading(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 3) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(value)}&apiKey=${apiKey}&format=json`
      const res = await fetch(url)
      if (!res.ok) return
      const data = await res.json()
      setSuggestions(data.results ?? [])
      setShowSuggestions(true)
    }, 300)
  }

  function handleSelect(suggestion: Suggestion) {
    setQuery(suggestion.formatted)
    setSuggestions([])
    setShowSuggestions(false)
    onSelect({
      placeId: suggestion.place_id,
      formatted: suggestion.formatted,
      lat: suggestion.lat,
      lon: suggestion.lon,
    })
    loadResidentCount(suggestion)
  }

  // Resolves the picked address to a building (creating it if this is the
  // first person from there) purely to show a resident count — the parent
  // form independently resolves it again on submit, which stays the source
  // of truth for what actually gets saved.
  async function loadResidentCount(suggestion: Suggestion) {
    setCountLoading(true)
    setResidentCount(null)

    const supabase = createClient()
    const { data: buildingId, error: buildingError } = await supabase.rpc('find_or_create_building', {
      p_place_id: suggestion.place_id,
      p_formatted: suggestion.formatted,
      p_lat: suggestion.lat,
      p_lon: suggestion.lon,
    })

    if (buildingError || !buildingId) {
      setCountLoading(false)
      return
    }

    const { data: count, error: countError } = await supabase.rpc('count_building_residents', {
      p_building_id: buildingId,
    })

    setCountLoading(false)
    if (!countError) setResidentCount(Number(count))
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        required
        autoComplete="off"
        placeholder="Start typing your address…"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {helperText && <p className="mt-1 text-xs text-gray-400">{helperText}</p>}

      {countLoading && (
        <p className="mt-1 text-xs text-gray-400">Checking this building…</p>
      )}
      {!countLoading && residentCount !== null && (
        residentCount > 0 ? (
          <p className="mt-1 text-xs text-green-600">
            🎉 {residentCount} other resident{residentCount === 1 ? '' : 's'} already here
          </p>
        ) : (
          <p className="mt-1 text-xs text-amber-600">
            You'll be the first here — double-check this is the right address.
          </p>
        )
      )}

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-md max-h-60 overflow-auto">
          {suggestions.map(s => (
            <li key={s.place_id}>
              {/* onMouseDown (not onClick) fires before the input's onBlur closes the list. */}
              <button
                type="button"
                onMouseDown={() => handleSelect(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              >
                {s.formatted}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
