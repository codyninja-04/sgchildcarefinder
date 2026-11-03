// Singapore infant care and childcare subsidy estimate.
//
// The numbers come straight from ECDA's published subsidy tables ("Subsidies for
// childcare and infant care", updated 6 Oct 2026). Two sets are in force around now:
// the 2026 rates, and new rates from 1 Jan 2027 that widen the income bands. We pick
// the set by the month your child would start, which is what decides what you pay.
//
// This is deliberately plain code rather than something Claude works out. Claude is
// good at explaining the result, but the result itself has to be the same every time.
//
// Kindergartens (MOE K and the like) are funded through KiFAS instead, which is not
// modelled here.

import type { Citizenship, Level, Programme } from './types'

export type RateYear = 2026 | 2027
export type CareKind = 'infant' | 'childcare'

interface Band {
  hhiMax: number
  pciMax: number
}

interface ProgrammeTable {
  /** Basic Subsidy for a working applicant. */
  basic: number
  /** Basic Subsidy for a non working applicant. */
  basicNonWorking: number
  /** Max Additional Subsidy per income band, lowest band first. */
  maxAdditional: number[]
  /** Minimum you still pay per band once Additional Subsidy applies. */
  minCopay: number[]
}

const BANDS: Record<RateYear, Band[]> = {
  2026: [
    { hhiMax: 3000, pciMax: 750 },
    { hhiMax: 4500, pciMax: 1125 },
    { hhiMax: 6000, pciMax: 1500 },
    { hhiMax: 7500, pciMax: 1875 },
    { hhiMax: 9000, pciMax: 2250 },
    { hhiMax: 10500, pciMax: 2625 },
    { hhiMax: 12000, pciMax: 3000 },
  ],
  2027: [
    { hhiMax: 3500, pciMax: 750 },
    { hhiMax: 5500, pciMax: 1200 },
    { hhiMax: 7500, pciMax: 1700 },
    { hhiMax: 9000, pciMax: 2100 },
    { hhiMax: 11000, pciMax: 2600 },
    { hhiMax: 13000, pciMax: 3000 },
    { hhiMax: 15000, pciMax: 3400 },
  ],
}

/**
 * Families with a child in childcare at or under these incomes get the full
 * working applicant subsidies even if the main applicant is not working
 * (from 9 Dec 2024, thresholds raised from 1 Jan 2027). Infant care is not covered.
 */
const FULL_SUBSIDY_REGARDLESS: Record<RateYear, Band> = {
  2026: { hhiMax: 6000, pciMax: 1500 },
  2027: { hhiMax: 7500, pciMax: 1700 },
}

// The subsidy amounts are the same in both years. Only the bands move.
const TABLES: Record<CareKind, Record<Programme, ProgrammeTable>> = {
  childcare: {
    full_day: {
      basic: 300,
      basicNonWorking: 150,
      maxAdditional: [467, 440, 340, 260, 190, 130, 80],
      minCopay: [3, 25, 58, 104, 162, 232, 315],
    },
    half_day: {
      basic: 150,
      basicNonWorking: 150,
      maxAdditional: [235, 220, 170, 130, 95, 65, 40],
      minCopay: [2, 15, 29, 52, 81, 116, 158],
    },
  },
  infant: {
    full_day: {
      basic: 600,
      basicNonWorking: 150,
      maxAdditional: [710, 640, 500, 380, 240, 100, 40],
      minCopay: [40, 110, 250, 360, 500, 640, 700],
    },
    half_day: {
      basic: 300,
      basicNonWorking: 150,
      maxAdditional: [355, 320, 250, 190, 120, 50, 20],
      minCopay: [20, 60, 130, 185, 255, 325, 355],
    },
  },
}

/** A household needs at least this many members for per capita income to count. */
export const PCI_MIN_HOUSEHOLD = 5

export const NEW_RATES_FROM = '2027-01-01'

export interface SubsidyInput {
  care: CareKind
  programme: Programme
  monthlyFee: number
  /** Main applicant (the mother, or a single father) works at least 56 hours a month. */
  isWorking: boolean
  /** Gross monthly household income. Null means we don't know, so no Additional Subsidy. */
  householdIncome: number | null
  householdSize?: number | null
  citizenship: Citizenship
  /** ISO date the child would start. Decides which year's rates apply. */
  startDate?: string | null
}

export interface SubsidyResult {
  eligible: boolean
  rateYear: RateYear
  fee: number
  basic: number
  additional: number
  total: number
  net: number
  /** Index into the income bands, 0 is the lowest income. Null if above the ceiling or unknown. */
  band: number | null
  bandLabel: string | null
  /** True if a non working applicant was treated as working because of low income. */
  fullSubsidyRegardless: boolean
  /** True if the minimum co-payment held the Additional Subsidy below its max. */
  cappedByCopay: boolean
  minCopay: number | null
  maxAdditional: number | null
  usedPerCapita: boolean
  notes: string[]
}

export function rateYearFor(startDate?: string | null): RateYear {
  return startDate && startDate >= NEW_RATES_FROM ? 2027 : 2026
}

export function careKindForLevel(level: Level): CareKind {
  return level === 'infant' ? 'infant' : 'childcare'
}

export function perCapitaIncome(income: number, size: number): number {
  return Math.floor(income / Math.max(1, size))
}

function bandIndex(year: RateYear, income: number, size: number | null | undefined) {
  const bands = BANDS[year]
  const byHhi = bands.findIndex((b) => income <= b.hhiMax)

  let byPci = -1
  if (size && size >= PCI_MIN_HOUSEHOLD) {
    const pci = perCapitaIncome(income, size)
    byPci = bands.findIndex((b) => pci <= b.pciMax)
  }

  // A lower index means more subsidy. Take whichever assessment helps the family.
  const candidates = [byHhi, byPci].filter((i) => i >= 0)
  if (candidates.length === 0) return { index: null, usedPerCapita: false }
  const index = Math.min(...candidates)
  return { index, usedPerCapita: byPci >= 0 && byPci === index && (byHhi < 0 || byPci < byHhi) }
}

export function bandLabel(year: RateYear, index: number): string {
  const bands = BANDS[year]
  const upper = bands[index].hhiMax
  if (index === 0) return `$${upper.toLocaleString('en-SG')} and below`
  const lower = bands[index - 1].hhiMax + 1
  return `$${lower.toLocaleString('en-SG')} to $${upper.toLocaleString('en-SG')}`
}

export function incomeCeiling(year: RateYear): number {
  const bands = BANDS[year]
  return bands[bands.length - 1].hhiMax
}

function qualifiesRegardless(year: RateYear, income: number, size: number | null | undefined) {
  const t = FULL_SUBSIDY_REGARDLESS[year]
  if (income <= t.hhiMax) return true
  return !!size && size >= PCI_MIN_HOUSEHOLD && perCapitaIncome(income, size) <= t.pciMax
}

export function estimateSubsidy(input: SubsidyInput): SubsidyResult {
  const fee = Math.max(0, Math.round(input.monthlyFee))
  const rateYear = rateYearFor(input.startDate)
  const notes: string[] = []

  const empty: SubsidyResult = {
    eligible: false,
    rateYear,
    fee,
    basic: 0,
    additional: 0,
    total: 0,
    net: fee,
    band: null,
    bandLabel: null,
    fullSubsidyRegardless: false,
    cappedByCopay: false,
    minCopay: null,
    maxAdditional: null,
    usedPerCapita: false,
    notes,
  }

  if (input.citizenship !== 'citizen') {
    notes.push('Basic and Additional Subsidies are only for Singapore Citizen children. PR and foreign children pay the full fee.')
    return empty
  }

  const table = TABLES[input.care][input.programme]
  const income = input.householdIncome

  let working = input.isWorking
  let fullSubsidyRegardless = false
  if (!working && input.care === 'childcare' && income != null && qualifiesRegardless(rateYear, income, input.householdSize)) {
    working = true
    fullSubsidyRegardless = true
    notes.push('Your household income is low enough that childcare subsidies apply in full even though the main applicant is not working.')
  }

  const basic = Math.min(fee, working ? table.basic : table.basicNonWorking)

  let additional = 0
  let band: number | null = null
  let usedPerCapita = false
  let cappedByCopay = false
  let minCopay: number | null = null
  let maxAdditional: number | null = null

  if (!working) {
    notes.push('Additional Subsidy needs the main applicant to be working at least 56 hours a month. Studying, job hunting or caring for a family member can qualify for Special Approval, which ECDA assesses case by case.')
  } else if (income == null) {
    notes.push('Add your gross monthly household income to see whether you also get Additional Subsidy.')
  } else {
    const found = bandIndex(rateYear, income, input.householdSize)
    band = found.index
    usedPerCapita = found.usedPerCapita
    if (band == null) {
      notes.push(
        `Additional Subsidy stops above $${incomeCeiling(rateYear).toLocaleString('en-SG')} a month household income${
          rateYear === 2026 ? ' (rising to $15,000 from 1 Jan 2027)' : ''
        }.`
      )
    } else {
      maxAdditional = table.maxAdditional[band]
      minCopay = table.minCopay[band]
      const room = Math.max(0, fee - basic - minCopay)
      additional = Math.min(maxAdditional, room)
      cappedByCopay = additional < maxAdditional
      if (usedPerCapita) notes.push('Assessed on per capita income, since that gives your household a better band.')
      if (cappedByCopay) {
        notes.push(`You still pay a minimum of $${minCopay} a month at this income band, so Additional Subsidy is $${additional} rather than the full $${maxAdditional}.`)
      }
    }
  }

  if (rateYear === 2027) notes.push('Uses the new income bands that start on 1 Jan 2027.')

  const total = basic + additional
  return {
    eligible: true,
    rateYear,
    fee,
    basic,
    additional,
    total,
    net: fee - total,
    band,
    bandLabel: band == null ? null : bandLabel(rateYear, band),
    fullSubsidyRegardless,
    cappedByCopay,
    minCopay,
    maxAdditional,
    usedPerCapita,
    notes,
  }
}

/** For the calculator's band table. */
export function subsidyTable(year: RateYear, care: CareKind, programme: Programme) {
  const table = TABLES[care][programme]
  return BANDS[year].map((_, i) => ({
    label: bandLabel(year, i),
    basic: table.basic,
    maxAdditional: table.maxAdditional[i],
    minCopay: table.minCopay[i],
  }))
}
