// browse/page.tsx — public page showing all available cars.
// This is a Server Component: data is fetched on the server before the page is sent
// to the browser, so there's no loading spinner — the cars are already there on arrival.
// The page is public (no login required) — the Supabase RLS policy allows anyone
// to read rows where available = true.
import { createClient } from '@/lib/supabase/server'
import CarCard from '@/components/CarCard'

export default async function BrowsePage() {
  const supabase = await createClient()

  // Fetch all available cars, joining each car's owner profile in the same query.
  // Supabase supports this because profiles.id = cars.owner_id (foreign key).
  const { data: cars } = await supabase
    .from('cars')
    .select(`
      id, make, model, year, colour, photo_url,
      daily_rate, availability_type,
      available_from, available_to, available_days,
      profiles (
        full_name,
        unit_number,
        avatar_url
      )
    `)
    .eq('available', true)
    .order('created_at', { ascending: false })

  const count = cars?.length ?? 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Available cars</h1>
        <p className="text-sm text-gray-500 mt-1">
          {count === 0
            ? 'No cars listed yet.'
            : `${count} car${count === 1 ? '' : 's'} available in your building`}
        </p>
      </div>

      {count > 0 ? (
        // Responsive grid: 1 column on mobile, 2 on tablet, 3 on desktop
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars!.map(car => (
            <CarCard key={car.id} car={car as any} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <svg className="w-12 h-12 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h6l2-2zm4 0V8a1 1 0 00-1-1h-3" />
          </svg>
          <p className="text-gray-400 text-sm">No cars listed yet.</p>
          <p className="text-gray-400 text-sm">Be the first to share yours!</p>
        </div>
      )}

    </div>
  )
}
