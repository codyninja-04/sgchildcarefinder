// Turns ECDA's two public datasets on data.gov.sg into our centre and fee rows.
//
//   Listing of Centres                        d_696c994c50745b079b3684f0e90ffc53
//     one row per centre, with ECDA's vacancy indicator for the next 7 months
//   Listing of centres' programme offerings   d_44cfe12f2858ae503a093dfc075a28be
//     one row per centre x level x programme x citizenship, with the monthly fee
//
// Kept free of I/O so it can be tested against real rows. The fetching and
// writing lives in scripts/import-ecda.ts.

import type { CentreType, Citizenship, Level, Programme, SchemeType, Vacancy, VacancyMap } from './types'

export const ECDA_CENTRES_DATASET = 'd_696c994c50745b079b3684f0e90ffc53'
export const ECDA_FEES_DATASET = 'd_44cfe12f2858ae503a093dfc075a28be'

export type EcdaCentreRow = Record<string, string | number | null | undefined>

export interface EcdaFeeRow {
  centre_code: string
  type_of_service: string
  levels_offered: string
  fees: string
  type_of_citizenship: string
}

const VACANCY_PREFIX: Record<Level, string> = {
  infant: 'infant',
  pg: 'pg',
  n1: 'n1',
  n2: 'n2',
  k1: 'k1',
  k2: 'k2',
}

const MONTH_SUFFIXES = ['current', 'next', 'third', 'fourth', 'fifth', 'sixth', 'seventh']

// Anchor operator names, shortened to what parents actually call them.
const OPERATOR_NAMES: Record<string, string> = {
  'PCF Sparkletots Preschool Limited': 'PCF Sparkletots',
  'NTUC First Campus Co-Operative Ltd': 'My First Skool',
  'MY World Preschool Ltd': 'M.Y World',
  'E-Bridge Pre-school Pte. Ltd.': 'E-Bridge',
  'Skool4Kidz Pte Ltd': 'Skool4Kidz',
  'MOE Kindergarten': 'MOE Kindergarten',
  'Presbyterian Community Services': 'Presbyterian Community Services',
  'Not-for-Profit Organisation': 'Not for profit',
  Workplace: 'Workplace centre',
  'Private Operators': 'independent',
}

function text(value: unknown): string {
  if (value == null) return ''
  const s = String(value).trim()
  return s === 'na' || s === 'NA' || s === 'Not Available' || s === '-' ? '' : s
}

function yes(value: unknown) {
  return text(value).toLowerCase() === 'yes'
}

export function parseVacancy(value: unknown): Vacancy {
  const s = text(value).toLowerCase()
  if (s.startsWith('available')) return 'available'
  if (s.startsWith('limited')) return 'limited'
  if (s.startsWith('full')) return 'full'
  return 'na'
}

export function parseVacancyMap(row: EcdaCentreRow): VacancyMap {
  const map: VacancyMap = {}
  for (const [level, prefix] of Object.entries(VACANCY_PREFIX) as [Level, string][]) {
    map[level] = MONTH_SUFFIXES.map((suffix) => parseVacancy(row[`${prefix}_vacancy_${suffix}_month`]))
  }
  return map
}

export function parseScheme(value: unknown): SchemeType | null {
  const s = text(value).toLowerCase()
  if (s.startsWith('anchor')) return 'anchor'
  if (s.startsWith('partner')) return 'partner'
  return null
}

export function parseLanguages(value: unknown): string[] {
  return text(value)
    .split('|')
    .map((part) => part.replace(/^Others:\s*/i, '').trim())
    .filter(Boolean)
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^|[\s(@/&-])([a-z])/g, (_m, pre: string, c: string) => pre + c.toUpperCase())
    .replace(/#(\w)/g, (_m, c: string) => `#${c.toUpperCase()}`)
    .replace(/\b(\d+)([a-z])\b/g,(_m, n: string, c: string) => n + c.toUpperCase())
}

/** ECDA addresses look like "59,YUK TONG AVENUE,#01-11,NIL,596360". Make them readable. */
export function tidyAddress(raw: unknown, postal: string): string {
  const parts = text(raw)
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && p !== postal && p.toUpperCase() !== 'NIL')
  const joined = titleCase(parts.join(' '))
  return postal ? `${joined}, Singapore ${postal}` : joined
}

// Codes and acronyms that should stay upper case once the rest is title cased.
const KEEP_UPPER = ['PCF', 'MOE', 'NTUC', 'YMCA', 'YWCA', 'CC', 'DS', 'EY', 'KN', 'EYC', 'ECDA', 'NUS', 'NTU', 'SMU', 'HDB', 'MOH', 'MOM', 'ACS', 'CB', 'II', 'III']

export function tidyName(raw: unknown): string {
  let s = text(raw)
    .replace(/\s*@\s*/g, ' @ ')
    .replace(/[\s,]+(PTE\.?\s*)?(LTD|LIMITED|LLP)\.?$/i, '')
    .replace(/[\s,]+PTE\.?$/i, '')
    .trim()
  // Many names are all caps. Mixed case names were typed with care, so leave them.
  if (s !== s.toUpperCase()) return s
  s = titleCase(s)
  for (const word of KEEP_UPPER) {
    s = s.replace(new RegExp(`\\b${word}\\b`, 'gi'), word)
  }
  return s
    .replace(/\(([A-Za-z]{2,3})\)/g, (_m, code: string) => `(${code.toUpperCase()})`)
    .replace(/\bMy World\b/g, 'M.Y World')
}

/**
 * Some operators register several centres under the same bare name ("MY FIRST SKOOL").
 * Add the street so parents can tell them apart.
 */
export function disambiguateNames<T extends { name: string; address: string }>(centres: T[]): T[] {
  const counts = new Map<string, number>()
  for (const c of centres) counts.set(c.name.toLowerCase(), (counts.get(c.name.toLowerCase()) ?? 0) + 1)
  return centres.map((c) => {
    if ((counts.get(c.name.toLowerCase()) ?? 0) < 2 || c.name.includes('@')) return c
    const street = c.address.split(',')[0].split('#')[0].replace(/\s+/g, ' ').trim()
    return street ? { ...c, name: `${c.name} @ ${street}` } : c
  })
}

export function operatorName(raw: unknown): string | null {
  const s = text(raw)
  if (!s) return null
  return OPERATOR_NAMES[s] ?? s
}

export function centreTypeFor(serviceModel: string, vacancy: VacancyMap): CentreType {
  if (serviceModel === 'KN') return 'kindergarten'
  const infant = vacancy.infant?.some((v) => v !== 'na') ?? false
  const older = (['pg', 'n1', 'n2', 'k1', 'k2'] as Level[]).some((l) => vacancy[l]?.some((v) => v !== 'na'))
  if (infant && !older) return 'infant_care'
  return 'childcare'
}

export function hasInfantCare(vacancy: VacancyMap, fees: ParsedFee[]): boolean {
  return (vacancy.infant?.some((v) => v !== 'na') ?? false) || fees.some((f) => f.level === 'infant')
}

export interface ParsedCentre {
  centre_code: string
  name: string
  centre_type: CentreType
  service_model: string | null
  operator: string | null
  scheme_type: SchemeType | null
  is_anchor_operator: boolean
  address: string
  postal_code: string | null
  operating_hours: string | null
  saturday_hours: string | null
  languages: string[]
  food_offered: string | null
  spark_certified: boolean
  extended_hours: boolean
  provides_transport: boolean
  government_subsidy: boolean
  phone: string | null
  email: string | null
  website: string | null
  vacancy: VacancyMap
  ecda_updated_on: string | null
}

export function parseCentre(row: EcdaCentreRow): ParsedCentre | null {
  const code = text(row.centre_code)
  // A handful of rows have no name but carry it in the address instead.
  const name =
    tidyName(row.centre_name) ||
    tidyName(
      text(row.centre_address)
        .split(',')
        .find((part) => part.includes('@'))
    )
  if (!code || !name) return null

  const postal = text(row.postal_code).replace(/\D/g, '').padStart(6, '0')
  const vacancy = parseVacancyMap(row)
  const serviceModel = text(row.service_model)
  const scheme = parseScheme(row.scheme_type)
  const website = text(row.centre_website) || text(row.website_lifesg)

  return {
    centre_code: code,
    name,
    centre_type: centreTypeFor(serviceModel, vacancy),
    service_model: serviceModel || null,
    operator: operatorName(row.organisation_description),
    scheme_type: scheme,
    is_anchor_operator: scheme === 'anchor',
    address: tidyAddress(row.centre_address, postal.length === 6 && postal !== '000000' ? postal : ''),
    postal_code: postal.length === 6 && postal !== '000000' ? postal : null,
    operating_hours: text(row.weekday_full_day) || null,
    saturday_hours: text(row.saturday) || null,
    languages: parseLanguages(row.second_languages_offered),
    food_offered: text(row.food_offered) || null,
    spark_certified: yes(row.spark_certified),
    extended_hours: yes(row.extended_operating_hours),
    provides_transport: yes(row.provision_of_transport),
    government_subsidy: text(row.government_subsidy) ? yes(row.government_subsidy) : true,
    phone: text(row.centre_contact_no) || text(row.contactno_lifesg) || null,
    email: (text(row.centre_email_address) || text(row.emailaddress_lifesg)).toLowerCase() || null,
    website: website ? (website.startsWith('http') ? website : `https://${website}`) : null,
    vacancy,
    ecda_updated_on: /^\d{4}-\d{2}-\d{2}$/.test(text(row.last_updated)) ? text(row.last_updated) : null,
  }
}

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------

export interface ParsedFee {
  centre_code: string
  level: Level
  programme: Programme
  citizenship: Citizenship
  monthly_fee: number
}

export function parseLevel(value: string): Level | null {
  const s = value.toLowerCase()
  if (s.startsWith('infant')) return 'infant'
  if (s.startsWith('playgroup')) return 'pg'
  if (s.startsWith('pre-nursery') || s.startsWith('pre nursery') || s.startsWith('nursery 1')) return 'n1'
  if (s.startsWith('nursery')) return 'n2'
  if (s.startsWith('kindergarten 1') || s.startsWith('k1')) return 'k1'
  if (s.startsWith('kindergarten 2') || s.startsWith('k2')) return 'k2'
  return null
}

export function parseProgramme(value: string): Programme | null {
  const s = value.toLowerCase()
  if (s.startsWith('full')) return 'full_day'
  if (s.startsWith('half')) return 'half_day'
  return null
}

export function parseCitizenship(value: string): Citizenship | null {
  const s = value.toUpperCase()
  if (s === 'SC') return 'citizen'
  if (s === 'SPR' || s === 'PR') return 'pr'
  if (s === 'OTHERS' || s === 'OTHER') return 'other'
  return null
}

export function parseFee(row: EcdaFeeRow): ParsedFee | null {
  const level = parseLevel(text(row.levels_offered))
  const programme = parseProgramme(text(row.type_of_service))
  const citizenship = parseCitizenship(text(row.type_of_citizenship))
  const fee = Math.round(Number(text(row.fees).replace(/[$,]/g, '')))
  if (!level || !programme || !citizenship || !Number.isFinite(fee) || fee <= 0) return null
  return { centre_code: text(row.centre_code), level, programme, citizenship, monthly_fee: fee }
}

/** One fee per centre/level/programme/citizenship. Where ECDA lists two, keep the higher. */
export function dedupeFees(fees: ParsedFee[]): ParsedFee[] {
  const map = new Map<string, ParsedFee>()
  for (const fee of fees) {
    const key = `${fee.centre_code}|${fee.level}|${fee.programme}|${fee.citizenship}`
    const existing = map.get(key)
    if (!existing || fee.monthly_fee > existing.monthly_fee) map.set(key, fee)
  }
  return [...map.values()]
}

/** The headline fees we keep on the centre row for sorting. All Singapore Citizen. */
export function headlineFees(fees: ParsedFee[]) {
  const sc = fees.filter((f) => f.citizenship === 'citizen')
  const pick = (programme: Programme, levels: Level[]) => {
    const values = sc.filter((f) => f.programme === programme && levels.includes(f.level)).map((f) => f.monthly_fee)
    return values.length ? Math.max(...values) : null
  }
  const older: Level[] = ['pg', 'n1', 'n2', 'k1', 'k2']
  return {
    monthly_fee_full_day: pick('full_day', older),
    monthly_fee_half_day: pick('half_day', older),
    monthly_fee_infant_full_day: pick('full_day', ['infant']),
  }
}
