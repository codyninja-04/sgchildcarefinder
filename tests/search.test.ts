import { describe, expect, it } from 'vitest'
import { boundingBox, rankCentres, summarise, type SearchParams } from '@/lib/search'
import type { Centre, CentreFee, Vacancy } from '@/lib/types'

const home = { lat: 1.3984, lng: 103.9072 } // Punggol

function centre(id: string, over: Partial<Centre> & { infant?: Vacancy[] }): Centre {
  const { infant, ...rest } = over
  return {
    id,
    updated_at: '2026-11-03',
    centre_code: id,
    name: `Centre ${id}`,
    centre_type: 'childcare',
    service_model: 'CC',
    operator: 'independent',
    scheme_type: null,
    is_anchor_operator: false,
    offers_infant_care: true,
    address: '',
    postal_code: null,
    lat: home.lat,
    lng: home.lng,
    geocode_precision: 'exact',
    monthly_fee_full_day: null,
    monthly_fee_half_day: null,
    monthly_fee_infant_full_day: null,
    operating_hours: null,
    saturday_hours: null,
    languages: [],
    food_offered: null,
    spark_certified: false,
    extended_hours: false,
    provides_transport: false,
    government_subsidy: true,
    phone: null,
    email: null,
    website: null,
    vacancy: { infant: infant ?? Array<Vacancy>(7).fill('available') },
    ecda_updated_on: '2026-11-02',
    ...rest,
  }
}

const fee = (centre_id: string, monthly_fee: number): CentreFee => ({
  centre_id,
  level: 'infant',
  programme: 'full_day',
  citizenship: 'citizen',
  monthly_fee,
})

const params: SearchParams = {
  origin: home,
  radiusKm: 3,
  level: 'infant',
  startDate: '2027-01-04',
  programme: 'full_day',
  scheme: 'all',
  hideFull: false,
  sort: 'distance',
  citizenship: 'citizen',
  householdIncome: 8000,
  householdSize: 3,
  isWorking: true,
}

const centres = [
  centre('near', { lat: home.lat + 0.004, infant: ['available', 'available', 'full', 'full', 'full', 'full', 'full'] }),
  centre('mid', { lat: home.lat + 0.012, scheme_type: 'anchor', infant: Array(7).fill('limited') }),
  centre('far', { lat: home.lat + 0.05 }),
  centre('noinfant', { vacancy: { infant: Array(7).fill('na'), pg: Array(7).fill('available') } }),
  centre('private', { lat: home.lat + 0.008, government_subsidy: false }),
]
const fees = [fee('near', 1500), fee('mid', 1270), fee('far', 1300), fee('private', 2400)]

describe('rankCentres', () => {
  it('keeps centres inside the radius that offer the level, nearest first', () => {
    const ids = rankCentres(centres, fees, params).map((r) => r.centre.id)
    expect(ids).toEqual(['near', 'private', 'mid'])
  })

  it('reads vacancy for the start month', () => {
    const near = rankCentres(centres, fees, params).find((r) => r.centre.id === 'near')!
    expect(near.vacancy).toBe('full')
  })

  it('hides full centres when asked', () => {
    const ids = rankCentres(centres, fees, { ...params, hideFull: true }).map((r) => r.centre.id)
    expect(ids).not.toContain('near')
  })

  it('filters to anchor operators', () => {
    const ids = rankCentres(centres, fees, { ...params, scheme: 'anchor' }).map((r) => r.centre.id)
    expect(ids).toEqual(['mid'])
  })

  it('works out the fee after subsidy, and charges full fee where there is no subsidy', () => {
    const results = rankCentres(centres, fees, params)
    const mid = results.find((r) => r.centre.id === 'mid')!
    // 2027 infant care at $8,000 HHI is the $7,501 to $9,000 band: $600 basic, up to $380
    // additional, but the $360 minimum co-payment holds it to $310.
    expect(mid.subsidy).toBe(910)
    expect(mid.net_fee).toBe(360)
    expect(results.find((r) => r.centre.id === 'private')!.net_fee).toBe(2400)
  })

  it('sorts by fee after subsidy', () => {
    const ids = rankCentres(centres, fees, { ...params, sort: 'net_fee' }).map((r) => r.centre.id)
    expect(ids[0]).toBe('mid')
    expect(ids[ids.length - 1]).toBe('private')
  })

  it('sorts by vacancy', () => {
    const ids = rankCentres(centres, fees, { ...params, sort: 'vacancy', startDate: '2026-11-15' }).map((r) => r.centre.id)
    expect(ids.slice(0, 2)).toEqual(['near', 'private'])
  })

  it('summarises', () => {
    const s = summarise(rankCentres(centres, fees, params))
    expect(s.total).toBe(3)
    expect(s.available).toBe(1)
    expect(s.limited).toBe(1)
    expect(s.lowestNet).toBe(360)
  })
})

describe('boundingBox', () => {
  it('covers roughly the radius', () => {
    const box = boundingBox(home, 2)
    expect(box.maxLat - box.minLat).toBeCloseTo(0.0362, 3)
  })
})
