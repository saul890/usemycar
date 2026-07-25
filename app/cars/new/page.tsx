'use client'
// cars/new/page.tsx — form for listing a car.
// Availability can be set three ways:
//   'always'     — car is always available
//   'date_range' — available between two specific dates
//   'recurring'  — available on chosen days of the week every week

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Car as CarIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type AvailabilityType = 'always' | 'date_range' | 'recurring'

export default function NewCarPage() {
  const router = useRouter()

  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [colour, setColour] = useState('')
  const [dailyRate, setDailyRate] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Availability
  const [availabilityType, setAvailabilityType] = useState<AvailabilityType>('always')
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableTo, setAvailableTo] = useState('')
  const [availableDays, setAvailableDays] = useState<string[]>([])

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Toggle a day on/off in the recurring schedule
  function toggleDay(day: string) {
    setAvailableDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validate recurring: must pick at least one day
    if (availabilityType === 'recurring' && availableDays.length === 0) {
      setError('Please select at least one day for your recurring schedule.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Generate the car's id up front so the photo (if any) can be uploaded
    // and named after it before the row itself is inserted.
    const carId = crypto.randomUUID()
    let photoUrl: string | null = null

    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const path = `${carId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('car-images')
        .upload(path, photoFile)

      if (uploadError) {
        setError('Photo upload failed. Please try again.')
        setLoading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('car-images').getPublicUrl(path)
      photoUrl = urlData.publicUrl
    }

    const { error: insertError } = await supabase.from('cars').insert({
      id: carId,
      owner_id: user.id,
      make,
      model,
      year: year ? parseInt(year, 10) : null,
      colour: colour || null,
      photo_url: photoUrl,
      daily_rate: parseFloat(dailyRate),
      available: true,
      availability_type: availabilityType,
      // Only store date fields when relevant — null otherwise
      available_from: availabilityType === 'date_range' ? availableFrom : null,
      available_to: availabilityType === 'date_range' ? availableTo : null,
      // Store recurring days as a comma-separated string e.g. "Mon,Sat,Sun"
      available_days: availabilityType === 'recurring' ? availableDays.join(',') : null,
    })

    if (insertError) {
      setError('Could not save your listing. Please try again.')
      setLoading(false)
      return
    }

    router.push('/browse')
    router.refresh()
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">List your car</h1>
      <p className="text-sm text-gray-500 mb-8">Share your car with your neighbours.</p>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Photo ── */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-full h-40 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center border border-gray-200">
            {photoPreview ? (
              <img src={photoPreview} alt="Car photo preview" className="w-full h-full object-cover" />
            ) : (
              <CarIcon className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
            )}
          </div>
          <label className="cursor-pointer text-sm text-blue-600 hover:underline font-medium">
            {photoPreview ? 'Change photo' : 'Add a photo (optional)'}
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </label>
        </div>

        {/* ── Make + Model ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="make" className="block text-sm font-medium text-gray-700 mb-1">Make</label>
            <input
              id="make"
              type="text"
              value={make}
              onChange={e => setMake(e.target.value)}
              required
              placeholder="Toyota"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <input
              id="model"
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              required
              placeholder="Camry"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* ── Year + Colour ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <input
              id="year"
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              min={1980}
              max={new Date().getFullYear() + 1}
              placeholder="2020"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="colour" className="block text-sm font-medium text-gray-700 mb-1">Colour</label>
            <input
              id="colour"
              type="text"
              value={colour}
              onChange={e => setColour(e.target.value)}
              placeholder="Silver"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* ── Daily rate ── */}
        <div>
          <label htmlFor="dailyRate" className="block text-sm font-medium text-gray-700 mb-1">Daily rate</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">$</span>
            <input
              id="dailyRate"
              type="number"
              value={dailyRate}
              onChange={e => setDailyRate(e.target.value)}
              required
              min={0}
              step={0.01}
              placeholder="50.00"
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* ── Availability ── */}
        <div className="space-y-4 pt-1 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 pt-3">When is your car available?</p>

          {/* Three options as radio buttons */}
          <div className="space-y-2">
            {([
              { value: 'always',     label: 'Always available' },
              { value: 'date_range', label: 'Specific date range' },
              { value: 'recurring',  label: 'Recurring — certain days each week' },
            ] as { value: AvailabilityType; label: string }[]).map(({ value, label }) => (
              <label key={value} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="availabilityType"
                  value={value}
                  checked={availabilityType === value}
                  onChange={() => setAvailabilityType(value)}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>

          {/* Date range pickers — shown only when 'date_range' is selected */}
          {availabilityType === 'date_range' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={availableFrom}
                  onChange={e => setAvailableFrom(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={availableTo}
                  onChange={e => setAvailableTo(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Day-of-week toggles — shown only when 'recurring' is selected */}
          {availabilityType === 'recurring' && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Available every:</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      availableDays.includes(day)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving…' : 'List my car'}
        </button>
      </form>
    </div>
  )
}
