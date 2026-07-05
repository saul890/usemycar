// components/ResidentCard.tsx — a single resident tile in the directory.
// Shows avatar (or initials if no photo), name, and unit number.

type Resident = {
  id: string
  full_name: string | null
  unit_number: string | null
  avatar_url: string | null
}

export default function ResidentCard({ resident }: { resident: Resident }) {
  // Build initials from the resident's name for the avatar fallback.
  // "Jane Smith" → "JS", "Alice" → "A"
  const initials = resident.full_name
    ? resident.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center text-center gap-3 shadow-sm hover:shadow-md transition-shadow">

      {/* Avatar — photo if available, coloured circle with initials if not */}
      {resident.avatar_url ? (
        <img
          src={resident.avatar_url}
          alt={resident.full_name || ''}
          className="w-16 h-16 rounded-full object-cover"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span className="text-blue-700 font-semibold text-lg">{initials}</span>
        </div>
      )}

      {/* Name and unit */}
      <div>
        <p className="font-medium text-gray-900 text-sm leading-snug">
          {resident.full_name || 'Resident'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Unit {resident.unit_number || '—'}
        </p>
      </div>

    </div>
  )
}
