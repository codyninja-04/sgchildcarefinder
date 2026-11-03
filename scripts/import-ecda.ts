// Pulls ECDA's centre listing and fee schedule from data.gov.sg, geocodes each
// centre with OneMap, and writes them to Supabase.
//
//   npm run import:ecda                 full import into Supabase
//   npm run import:ecda -- --dry-run    fetch and parse only, write a JSON summary
//   npm run import:ecda -- --limit 50   only the first 50 centres (handy for a first try)
//
// ECDA refreshes the listing every month, so run this monthly. Coordinates already
// in the database are reused when the postal code has not changed, so only new or
// moved centres hit OneMap after the first run.
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for a real import.
// DATA_GOV_SG_API_KEY is optional and only raises data.gov.sg's rate limit.

import { writeFileSync } from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  ECDA_CENTRES_DATASET,
  ECDA_FEES_DATASET,
  dedupeFees,
  disambiguateNames,
  hasInfantCare,
  headlineFees,
  parseCentre,
  parseFee,
  type EcdaCentreRow,
  type EcdaFeeRow,
  type ParsedFee,
} from '../lib/ecda'
import { geocodePostal, type Place } from '../lib/onemap'

config({ path: '.env.local' })
config()

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const limitArg = args.indexOf('--limit')
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) : null

const API = 'https://data.gov.sg/api/action/datastore_search'
const PAGE = 5000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function fetchAll<T>(datasetId: string, fields?: string[]): Promise<T[]> {
  let page = PAGE
  const rows: T[] = []
  let offset = 0
  let total = Infinity
  const headers: Record<string, string> = { accept: 'application/json' }
  if (process.env.DATA_GOV_SG_API_KEY) headers['x-api-key'] = process.env.DATA_GOV_SG_API_KEY

  while (offset < total) {
    const params = new URLSearchParams({ resource_id: datasetId, limit: String(page), offset: String(offset) })
    if (fields) params.set('fields', fields.join(','))
    const res = await fetch(`${API}?${params}`, { headers })
    const json = (await res.json()) as {
      success?: boolean
      code?: number
      result?: { records: T[]; total: number }
    }

    // data.gov.sg rate limits anonymous callers to a handful of requests a minute.
    if (json.code === 24 || res.status === 429) {
      process.stdout.write('  rate limited, waiting 12s\n')
      await sleep(12_000)
      continue
    }
    // Wide rows (the centre listing has 80 columns) trip a response size cap. Halve and retry.
    if (!json.success && JSON.stringify(json).includes('too large') && page > 100) {
      page = Math.floor(page / 2)
      continue
    }
    if (!json.success || !json.result) throw new Error(`data.gov.sg ${datasetId} failed: ${JSON.stringify(json).slice(0, 200)}`)

    rows.push(...json.result.records)
    total = json.result.total
    offset += json.result.records.length
    if (json.result.records.length === 0) break
    process.stdout.write(`  ${Math.min(offset, total)} / ${total}\n`)
    if (offset < total) await sleep(2_500)
  }
  return rows
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>) {
  const out: R[] = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i], i)
      }
    })
  )
  return out
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!DRY_RUN && (!supabaseUrl || !serviceKey)) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or pass --dry-run.')
  }
  const supabase = DRY_RUN ? null : createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } })

  console.log('Fetching ECDA centre listing')
  const rawCentres = await fetchAll<EcdaCentreRow>(ECDA_CENTRES_DATASET)
  let centres = disambiguateNames(rawCentres.map(parseCentre).filter((c): c is NonNullable<typeof c> => c !== null))
  if (LIMIT) centres = centres.slice(0, LIMIT)
  console.log(`Parsed ${centres.length} centres`)

  console.log('Fetching ECDA fee schedule')
  const rawFees = await fetchAll<EcdaFeeRow>(ECDA_FEES_DATASET, [
    'centre_code',
    'type_of_service',
    'levels_offered',
    'fees',
    'type_of_citizenship',
  ])
  const wanted = new Set(centres.map((c) => c.centre_code))
  const fees = dedupeFees(rawFees.map(parseFee).filter((f): f is ParsedFee => f !== null && wanted.has(f.centre_code)))
  const feesByCentre = new Map<string, ParsedFee[]>()
  for (const fee of fees) {
    const list = feesByCentre.get(fee.centre_code) ?? []
    list.push(fee)
    feesByCentre.set(fee.centre_code, list)
  }
  console.log(`Parsed ${fees.length} fee rows`)

  // Reuse coordinates we already have for the same postal code.
  const known = new Map<string, { lat: number; lng: number; postal: string | null; precision: 'exact' | 'approximate' }>()
  if (supabase) {
    const { data, error } = await supabase
      .from('childcare_centres')
      .select('centre_code, postal_code, lat, lng, geocode_precision')
    if (error) throw error
    for (const row of data ?? []) {
      known.set(row.centre_code, {
        lat: Number(row.lat),
        lng: Number(row.lng),
        postal: row.postal_code,
        precision: row.geocode_precision,
      })
    }
  }

  const postalCache = new Map<string, Place | null>()
  let geocoded = 0
  let approximate = 0
  console.log('Geocoding with OneMap')
  const located = await mapWithConcurrency(centres, 2, async (centre, i) => {
    const prior = known.get(centre.centre_code)
    if (prior && prior.postal === centre.postal_code && prior.precision === 'exact') {
      return { ...centre, lat: prior.lat, lng: prior.lng, geocode_precision: 'exact' as const }
    }
    if (!centre.postal_code) return null
    if (!postalCache.has(centre.postal_code)) {
      postalCache.set(centre.postal_code, await geocodePostal(centre.postal_code, { retries: 5 }))
      geocoded++
      await sleep(400)
    }
    const place = postalCache.get(centre.postal_code)
    if ((i + 1) % 100 === 0) process.stdout.write(`  ${i + 1} / ${centres.length}\n`)
    if (!place) return null
    if (place.precision === 'approximate') approximate++
    return { ...centre, lat: place.lat, lng: place.lng, geocode_precision: place.precision }
  })

  const rows = located
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map((c) => {
      const own = feesByCentre.get(c.centre_code) ?? []
      return {
        ...c,
        offers_infant_care: hasInfantCare(c.vacancy, own),
        ...headlineFees(own),
        updated_at: new Date().toISOString(),
      }
    })

  console.log(`Located ${rows.length} centres (${geocoded} OneMap lookups, ${approximate} approximate)`)

  if (DRY_RUN || !supabase) {
    const out = 'ecda-dry-run.json'
    writeFileSync(out, JSON.stringify({ centres: rows.length, fees: fees.length, sample: rows.slice(0, 5) }, null, 2))
    console.log(`Dry run, nothing written to Supabase. Summary in ${out}`)
    return
  }

  console.log('Writing centres')
  const idByCode = new Map<string, string>()
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500)
    const { data, error } = await supabase
      .from('childcare_centres')
      .upsert(chunk, { onConflict: 'centre_code' })
      .select('id, centre_code')
    if (error) throw error
    for (const row of data ?? []) idByCode.set(row.centre_code, row.id)
  }

  console.log('Writing fees')
  const ids = [...idByCode.values()]
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await supabase.from('centre_fees').delete().in('centre_id', ids.slice(i, i + 200))
    if (error) throw error
  }
  const feeRows = fees
    .filter((f) => idByCode.has(f.centre_code))
    .map((f) => ({
      centre_id: idByCode.get(f.centre_code)!,
      level: f.level,
      programme: f.programme,
      citizenship: f.citizenship,
      monthly_fee: f.monthly_fee,
    }))
  for (let i = 0; i < feeRows.length; i += 2000) {
    const { error } = await supabase.from('centre_fees').insert(feeRows.slice(i, i + 2000))
    if (error) throw error
  }

  console.log(`Done. ${rows.length} centres and ${feeRows.length} fee rows are up to date.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
