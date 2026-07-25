// components/CarCard.tsx — displays a single car listing.
// Used by the browse page. Server Component — no interactivity needed.

type Car = {
  id: string
  make: string
  model: string
  year: number | null
  colour: string | null
  photo_url: string | null
  daily_rate: number | null
  availability_type: string
  available_from: string | null
  available_to: string | null
  available_days: string | null
  profiles: {
    full_name: string | null
    unit_number: string | null
    avatar_url: string | null
  } | null
}

// Converts the stored availability fields into a human-readable string.
function formatAvailability(car: Car): string {
  if (car.availability_type === 'date_range' && car.available_from && car.available_to) {
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    return `${fmt(car.available_from)} – ${fmt(car.available_to)}`
  }
  if (car.availability_type === 'recurring' && car.available_days) {
    return `Every ${car.available_days.split(',').join(', ')}`
  }
  return 'Always available'
}

export default function CarCard({ car }: { car: Car }) {
  const owner = car.profiles

  // Build initials for the avatar fallback (e.g. "Jane Smith" → "JS")
  const initials = owner?.full_name
    ? owner.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">

      {/* Car photo — grey placeholder with a car icon if no photo */}
      <div className="h-44 bg-gray-100 flex items-center justify-center">
        {car.photo_url ? (
          <img
            src={car.photo_url}
            alt={`${car.make} ${car.model}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h6l2-2zm4 0V8a1 1 0 00-1-1h-3" />
          </svg>
        )}
      </div>

      <div className="p-4 space-y-3">

        {/* Make, model, year, colour */}
        <div>
          <h2 className="font-semibold text-gray-900 text-base">
            {car.make} {car.model}
          </h2>
          {(car.year || car.colour) && (
            <p className="text-sm text-gray-500">
              {[car.year, car.colour].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {/* Daily rate */}
        <p className="text-lg font-semibold text-blue-600">
          ${car.daily_rate?.toFixed(2)}
          <span className="text-sm font-normal text-gray-400"> / day</span>
        </p>

        {/* Availability */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formatAvailability(car)}</span>
        </div>

        {/* Owner info */}
        <div className="border-t border-gray-100 pt-3 flex items-center gap-2.5">
          {owner?.avatar_url ? (
            <img
              src={owner.avatar_url}
              alt={owner.full_name || ''}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-gray-600">{initials}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {owner?.full_name || 'Resident'}
            </p>
            <p className="text-xs text-gray-400">Unit {owner?.unit_number || '—'}</p>
          </div>
        </div>

      </div>
    </div>
  )
}
