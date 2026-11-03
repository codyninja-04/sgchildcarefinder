// OneMap is the Singapore Land Authority's map service. Its search endpoint is
// free, needs no key, and turns a postal code, block or street into coordinates.
// Used both by the importer (centre addresses) and by the address box in the app.

import { lookupPostalCode } from './geo'

const ENDPOINT = 'https://www.onemap.gov.sg/api/common/elastic/search'

export interface Place {
  address: string
  postal: string | null
  lat: number
  lng: number
  precision: 'exact' | 'approximate'
}

interface OneMapResult {
  ADDRESS?: string
  POSTAL?: string
  LATITUDE?: string
  LONGITUDE?: string
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\bSingapore\b/i, 'Singapore')
}

export function parseOneMap(json: unknown): Place[] {
  const results = (json as { results?: OneMapResult[] })?.results ?? []
  const places: Place[] = []
  for (const r of results) {
    const lat = Number(r.LATITUDE)
    const lng = Number(r.LONGITUDE)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0) continue
    places.push({
      address: titleCase(r.ADDRESS ?? ''),
      postal: r.POSTAL && r.POSTAL !== 'NIL' ? r.POSTAL : null,
      lat,
      lng,
      precision: 'exact',
    })
  }
  return places
}

export async function searchOneMap(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const url = `${ENDPOINT}?searchVal=${encodeURIComponent(q)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`
  const res = await fetch(url, { signal, headers: { accept: 'application/json' } })
  if (res.status === 429) throw new RateLimited()
  if (!res.ok) throw new Error(`OneMap returned ${res.status}`)
  return parseOneMap(await res.json())
}

export class RateLimited extends Error {
  constructor() {
    super('OneMap rate limit')
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Best effort coordinates for a postal code. Falls back to the centre of the
 * postal sector so a centre or a home never goes missing from the map.
 */
export async function geocodePostal(
  postal: string,
  { signal, retries = 0 }: { signal?: AbortSignal; retries?: number } = {}
): Promise<Place | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const hits = await searchOneMap(postal, signal)
      const exact = hits.find((h) => h.postal === postal) ?? hits[0]
      if (exact) return exact
      break
    } catch (err) {
      // OneMap allows a few requests a second. Back off and try again when told to.
      if (err instanceof RateLimited && attempt < retries) {
        await wait(1000 * 2 ** attempt)
        continue
      }
      break
    }
  }
  const sector = lookupPostalCode(postal)
  if (!sector) return null
  return { address: sector.area, postal, lat: sector.lat, lng: sector.lng, precision: 'approximate' }
}
