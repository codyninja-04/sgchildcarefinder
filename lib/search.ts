// Ranking for the centre finder. Pure, so the API route stays thin and this can
// be tested without a database.

import { distanceKm } from './geo'
import { offersLevel, vacancyFor } from './levels'
import { careKindForLevel, estimateSubsidy } from './subsidy'
import type { Centre, CentreFee, CentreResult, Citizenship, Level, Programme, Vacancy } from './types'

export type SchemeFilter = 'all' | 'anchor' | 'government'
export type SortKey = 'distance' | 'net_fee' | 'vacancy'

export interface SearchParams {
  origin: { lat: number; lng: number } | null
  radiusKm: number
  level: Level
  startDate: string
  programme: Programme
  scheme: SchemeFilter
  hideFull: boolean
  sort: SortKey
  citizenship: Citizenship
  householdIncome: number | null
  householdSize: number | null
  isWorking: boolean
}

export const RADIUS_OPTIONS = [1, 2, 3, 5, 8] as const

const VACANCY_RANK: Record<Vacancy, number> = { available: 0, limited: 1, full: 2, na: 3 }

/** Degrees of latitude/longitude that cover a radius in km around Singapore (lat ~1.35). */
export function boundingBox(origin: { lat: number; lng: number }, radiusKm: number) {
  const dLat = radiusKm / 110.57
  const dLng = radiusKm / (111.32 * Math.cos((origin.lat * Math.PI) / 180))
  return { minLat: origin.lat - dLat, maxLat: origin.lat + dLat, minLng: origin.lng - dLng, maxLng: origin.lng + dLng }
}

export function feeFor(fees: CentreFee[], centreId: string, level: Level, programme: Programme, citizenship: Citizenship) {
  return fees.find((f) => f.centre_id === centreId && f.level === level && f.programme === programme && f.citizenship === citizenship)?.monthly_fee ?? null
}

export function rankCentres(centres: Centre[], fees: CentreFee[], p: SearchParams): CentreResult[] {
  const results: CentreResult[] = []

  for (const centre of centres) {
    const fee = feeFor(fees, centre.id, p.level, p.programme, p.citizenship)
    const hasLevelFee = fees.some((f) => f.centre_id === centre.id && f.level === p.level)
    if (!offersLevel(centre.vacancy, p.level) && !hasLevelFee) continue

    if (p.scheme === 'anchor' && centre.scheme_type !== 'anchor') continue
    if (p.scheme === 'government' && !centre.scheme_type) continue

    const distance = p.origin ? distanceKm(p.origin, { lat: Number(centre.lat), lng: Number(centre.lng) }) : null
    if (distance != null && distance > p.radiusKm) continue

    const vacancy = vacancyFor(centre.vacancy, centre.ecda_updated_on, p.level, p.startDate)
    if (p.hideFull && vacancy === 'full') continue

    let net: number | null = null
    let subsidy: number | null = null
    if (fee != null) {
      const est = estimateSubsidy({
        care: careKindForLevel(p.level),
        programme: p.programme,
        monthlyFee: fee,
        isWorking: p.isWorking,
        householdIncome: p.householdIncome,
        householdSize: p.householdSize,
        citizenship: p.citizenship,
        startDate: p.startDate,
      })
      net = centre.government_subsidy ? est.net : fee
      subsidy = centre.government_subsidy ? est.total : 0
    }

    results.push({ centre, distance_km: distance, fee, net_fee: net, subsidy, vacancy })
  }

  const byDistance = (a: CentreResult, b: CentreResult) => (a.distance_km ?? 0) - (b.distance_km ?? 0)
  const byFee = (a: CentreResult, b: CentreResult) => (a.net_fee ?? Infinity) - (b.net_fee ?? Infinity)
  const byVacancy = (a: CentreResult, b: CentreResult) =>
    (a.vacancy ? VACANCY_RANK[a.vacancy] : 2.5) - (b.vacancy ? VACANCY_RANK[b.vacancy] : 2.5)

  results.sort((a, b) => {
    if (p.sort === 'net_fee') return byFee(a, b) || byDistance(a, b)
    if (p.sort === 'vacancy') return byVacancy(a, b) || byDistance(a, b)
    return byDistance(a, b) || a.centre.name.localeCompare(b.centre.name)
  })

  return results
}

/** Short summary for the results header, e.g. "12 with space in Jan". */
export function summarise(results: CentreResult[]) {
  const counts = { available: 0, limited: 0, full: 0, unknown: 0 }
  for (const r of results) {
    if (r.vacancy === 'available') counts.available++
    else if (r.vacancy === 'limited') counts.limited++
    else if (r.vacancy === 'full') counts.full++
    else counts.unknown++
  }
  const fees = results.map((r) => r.net_fee).filter((f): f is number => f != null).sort((a, b) => a - b)
  return { ...counts, total: results.length, lowestNet: fees[0] ?? null, medianNet: fees.length ? fees[Math.floor(fees.length / 2)] : null }
}
