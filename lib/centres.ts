import type { SupabaseClient } from '@supabase/supabase-js'
import { RADIUS_OPTIONS, boundingBox, type SchemeFilter, type SearchParams, type SortKey } from './search'
import { LEVELS } from './levels'
import type { Centre, CentreFee, Citizenship, Level, Profile, Programme } from './types'
import { searchContext } from './format'

// Everything the list, the map and the detail page read. Leaves out search_vector.
export const CENTRE_COLUMNS =
  'id, updated_at, centre_code, name, centre_type, service_model, operator, scheme_type, is_anchor_operator, offers_infant_care, address, postal_code, lat, lng, geocode_precision, monthly_fee_full_day, monthly_fee_half_day, monthly_fee_infant_full_day, operating_hours, saturday_hours, languages, food_offered, spark_certified, extended_hours, provides_transport, government_subsidy, phone, email, website, vacancy, ecda_updated_on'

export function normaliseCentre(row: Record<string, unknown>): Centre {
  return { ...(row as unknown as Centre), lat: Number(row.lat), lng: Number(row.lng), languages: (row.languages as string[]) ?? [], vacancy: (row.vacancy as Centre['vacancy']) ?? {} }
}

/** Reads search parameters from a query string, filling gaps from the profile. */
export function readSearchParams(query: URLSearchParams, profile: Profile): SearchParams & { q: string } {
  const ctx = searchContext(profile)
  const lat = Number(query.get('lat'))
  const lng = Number(query.get('lng'))
  const hasPoint = query.has('lat') && Number.isFinite(lat) && Number.isFinite(lng)
  const origin = hasPoint ? { lat, lng } : profile.home_lat != null && profile.home_lng != null ? { lat: profile.home_lat, lng: profile.home_lng } : null

  const radius = Number(query.get('radius'))
  const level = query.get('level') as Level
  const start = query.get('start')
  const scheme = query.get('scheme') as SchemeFilter
  const sort = query.get('sort') as SortKey
  const programme = query.get('programme') as Programme

  return {
    q: (query.get('q') ?? '').trim().slice(0, 80),
    origin,
    radiusKm: (RADIUS_OPTIONS as readonly number[]).includes(radius) ? radius : 3,
    level: LEVELS.includes(level) ? level : ctx.level,
    startDate: start && /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : ctx.startDate,
    programme: programme === 'half_day' ? 'half_day' : 'full_day',
    scheme: scheme === 'anchor' || scheme === 'government' ? scheme : 'all',
    hideFull: query.get('hideFull') === '1',
    sort: sort === 'net_fee' || sort === 'vacancy' ? sort : 'distance',
    citizenship: (profile.citizenship_status ?? 'citizen') as Citizenship,
    householdIncome: profile.household_income_monthly,
    householdSize: profile.household_size,
    isWorking: profile.is_working_mother,
  }
}

export async function loadCandidates(supabase: SupabaseClient, params: SearchParams & { q: string }) {
  let query = supabase.from('childcare_centres').select(CENTRE_COLUMNS)

  if (params.q) {
    // Name, operator, street or postal code. Trigram index keeps the ilike quick.
    const safe = params.q.replace(/[%_,()]/g, ' ')
    query = query.or(`name.ilike.%${safe}%,address.ilike.%${safe}%,operator.ilike.%${safe}%,postal_code.eq.${safe.replace(/\D/g, '') || '0'}`)
  }

  if (params.origin) {
    const box = boundingBox(params.origin, params.radiusKm)
    query = query.gte('lat', box.minLat).lte('lat', box.maxLat).gte('lng', box.minLng).lte('lng', box.maxLng)
  }

  const { data, error } = await query.limit(params.origin ? 600 : 80)
  if (error) throw error
  const centres = (data ?? []).map((row) => normaliseCentre(row as Record<string, unknown>))

  const fees: CentreFee[] = []
  const ids = centres.map((c) => c.id)
  for (let i = 0; i < ids.length; i += 200) {
    const { data: feeRows, error: feeError } = await supabase
      .from('centre_fees')
      .select('centre_id, level, programme, citizenship, monthly_fee')
      .in('centre_id', ids.slice(i, i + 200))
      .eq('level', params.level)
    if (feeError) throw feeError
    fees.push(...((feeRows ?? []) as CentreFee[]))
  }

  return { centres, fees }
}
