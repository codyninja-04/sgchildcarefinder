import type { Metadata } from 'next'
import { SearchClient } from '@/components/search/SearchClient'
import { requireUser } from '@/lib/auth'
import { readSearchParams } from '@/lib/centres'
import { searchContext } from '@/lib/format'

export const metadata: Metadata = { title: 'Find centres' }

export default async function SearchPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const { supabase, user, profile } = await requireUser()

  const query = new URLSearchParams(Object.entries(searchParams).filter((e): e is [string, string] => typeof e[1] === 'string'))
  const params = readSearchParams(query, profile)
  const ctx = searchContext(profile)

  const [{ data: tracked }, { data: latest }] = await Promise.all([
    supabase.from('waitlist_entries').select('centre_id').eq('user_id', user.id).in('status', ['waiting', 'offered', 'accepted']),
    supabase.from('childcare_centres').select('ecda_updated_on').order('ecda_updated_on', { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
  ])

  const origin =
    profile.home_lat != null && profile.home_lng != null
      ? { lat: profile.home_lat, lng: profile.home_lng, label: profile.home_address ?? 'Home' }
      : null

  return (
    <SearchClient
      initialFilters={{
        q: params.q,
        level: params.level,
        startDate: params.startDate,
        programme: params.programme,
        radiusKm: params.radiusKm,
        scheme: params.scheme,
        hideFull: params.hideFull,
        sort: params.sort,
      }}
      initialOrigin={origin}
      levelFromProfile={ctx.fromProfile && params.level === ctx.level}
      trackedIds={(tracked ?? []).map((t) => t.centre_id)}
      ecdaUpdatedOn={latest?.ecda_updated_on ?? null}
      hasIncome={profile.household_income_monthly != null}
    />
  )
}
