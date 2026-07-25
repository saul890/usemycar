// residents/page.tsx — directory of all residents who have completed their profile.
// Server Component: fetches profiles on the server, no loading state needed.
// Protected by middleware — only logged-in users can see this page.
//
// Hidden for now (flip RESIDENTS_PAGE_ENABLED to bring it back) — the link
// is also removed from components/Nav.tsx, but the route itself still
// 404s directly so it can't be reached by URL either.
import { notFound } from 'next/navigation'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ResidentCard from '@/components/ResidentCard'

const RESIDENTS_PAGE_ENABLED = false

export default async function ResidentsPage() {
  if (!RESIDENTS_PAGE_ENABLED) {
    notFound()
  }

  const supabase = await createClient()

  // Fetch all profiles that have a name — excludes accounts that signed up
  // but never completed the onboarding step.
  const { data: residents } = await supabase
    .from('profiles')
    .select('id, full_name, unit_number, avatar_url')
    .not('full_name', 'is', null)
    .order('unit_number', { ascending: true })

  const count = residents?.length ?? 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Residents</h1>
        <p className="text-sm text-gray-500 mt-1">
          {count === 0
            ? 'No residents yet.'
            : `${count} resident${count === 1 ? '' : 's'} in your building`}
        </p>
      </div>

      {count > 0 ? (
        // More columns than the car grid — resident cards are smaller
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {residents!.map(resident => (
            <ResidentCard key={resident.id} resident={resident} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Users className="w-12 h-12 text-gray-200 mb-4" strokeWidth={1.5} />
          <p className="text-gray-400 text-sm">No residents have joined yet.</p>
        </div>
      )}

    </div>
  )
}
