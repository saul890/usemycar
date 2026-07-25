// cars/[id]/page.tsx — full detail view for a single car listing.
// Server Component, reached by clicking a CarCard on /browse.
// RLS on `cars`/`profiles` already restricts this to the same building (or
// the car's own owner), so a car outside the viewer's building simply comes
// back empty here — same as if it didn't exist, which is the right privacy
// behaviour (don't reveal whether it exists at all).
//
// The owner's phone number is only ever fetched/shown on this page, never
// in the browse grid — that's the whole point of "click in to see contact
// info" rather than publishing it on every card.
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Car as CarIcon, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatAvailability, type Car } from '@/components/CarCard'

export default async function CarDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: car } = await supabase
    .from('cars')
    .select(`
      id, make, model, year, colour, photo_url,
      daily_rate, availability_type,
      available_from, available_to, available_days,
      profiles (
        full_name,
        unit_number,
        avatar_url,
        phone
      )
    `)
    .eq('id', id)
    .single()

  if (!car) {
    notFound()
  }

  const owner = car.profiles as unknown as {
    full_name: string | null
    unit_number: string | null
    avatar_url: string | null
    phone: string | null
  } | null

  const initials = owner?.full_name
    ? owner.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/browse" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
        ← Back to browse
      </Link>

      <div className="mt-4 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

        {/* Large photo */}
        <div className="h-80 bg-gray-100 flex items-center justify-center">
          {car.photo_url ? (
            <img
              src={car.photo_url}
              alt={`${car.make} ${car.model}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <CarIcon className="w-20 h-20 text-gray-300" strokeWidth={1.5} />
          )}
        </div>

        <div className="p-6 space-y-6">

          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {car.make} {car.model}
            </h1>
            {(car.year || car.colour) && (
              <p className="text-sm text-gray-500 mt-1">
                {[car.year, car.colour].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-2xl font-semibold text-blue-600">
              ${car.daily_rate?.toFixed(2)}
              <span className="text-sm font-normal text-gray-400"> / day</span>
            </p>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{formatAvailability(car as unknown as Car)}</span>
            </div>
          </div>

          {/* Owner + contact */}
          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center gap-3">
              {owner?.avatar_url ? (
                <img
                  src={owner.avatar_url}
                  alt={owner.full_name || ''}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-gray-600">{initials}</span>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">{owner?.full_name || 'Resident'}</p>
                <p className="text-xs text-gray-400">Unit {owner?.unit_number || '—'}</p>
              </div>
            </div>

            <div className="mt-4">
              {owner?.phone ? (
                <a
                  href={`tel:${owner.phone}`}
                  className="inline-flex items-center gap-2 py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Call {owner.phone}
                </a>
              ) : (
                <p className="text-sm text-gray-400">
                  This resident hasn't added a phone number yet — try the resident directory.
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
