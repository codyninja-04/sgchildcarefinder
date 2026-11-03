// Which class a child would be in on a given start date.
//
// Infant care is by age in months (2 to 18). Everything after that goes by the
// calendar year the child turns that age, the way Singapore preschools place
// children: turning 3 this year means Nursery 1, turning 5 means K1, and so on.

import type { Level, Vacancy, VacancyMap } from './types'

export const LEVELS: Level[] = ['infant', 'pg', 'n1', 'n2', 'k1', 'k2']

export const LEVEL_META: Record<Level, { label: string; short: string; ages: string }> = {
  infant: { label: 'Infant care', short: 'Infant', ages: '2 to 18 months' },
  pg: { label: 'Playgroup', short: 'PG', ages: '18 months to 2 years' },
  n1: { label: 'Nursery 1', short: 'N1', ages: 'turning 3' },
  n2: { label: 'Nursery 2', short: 'N2', ages: 'turning 4' },
  k1: { label: 'Kindergarten 1', short: 'K1', ages: 'turning 5' },
  k2: { label: 'Kindergarten 2', short: 'K2', ages: 'turning 6' },
}

export type LevelResult =
  | { ok: true; level: Level; ageMonths: number }
  | { ok: false; reason: 'too_young' | 'school_age' | 'invalid'; ageMonths: number }

function parse(date: string): Date | null {
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function monthsBetween(from: Date, to: Date): number {
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
  if (to.getUTCDate() < from.getUTCDate()) months -= 1
  return months
}

export function levelFor(birthDate: string, startDate: string): LevelResult {
  const birth = parse(birthDate)
  const start = parse(startDate)
  if (!birth || !start) return { ok: false, reason: 'invalid', ageMonths: 0 }

  const ageMonths = monthsBetween(birth, start)
  if (ageMonths < 2) return { ok: false, reason: 'too_young', ageMonths }
  if (ageMonths < 18) return { ok: true, level: 'infant', ageMonths }

  const turning = start.getUTCFullYear() - birth.getUTCFullYear()
  if (turning <= 2) return { ok: true, level: 'pg', ageMonths }
  if (turning === 3) return { ok: true, level: 'n1', ageMonths }
  if (turning === 4) return { ok: true, level: 'n2', ageMonths }
  if (turning === 5) return { ok: true, level: 'k1', ageMonths }
  if (turning === 6) return { ok: true, level: 'k2', ageMonths }
  return { ok: false, reason: 'school_age', ageMonths }
}

/** The earliest date a child can start infant care (two months old). */
export function earliestInfantStart(birthDate: string): string | null {
  const birth = parse(birthDate)
  if (!birth) return null
  const d = new Date(birth)
  d.setUTCMonth(d.getUTCMonth() + 2)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Vacancy
// ---------------------------------------------------------------------------

export const VACANCY_META: Record<Vacancy, { label: string; tone: string; dot: string; hex: string }> = {
  available: { label: 'Available', tone: 'text-offered bg-offered/10 border-offered/25', dot: 'bg-offered', hex: '#16A34A' },
  limited: { label: 'Limited', tone: 'text-waiting bg-waiting/10 border-waiting/25', dot: 'bg-waiting', hex: '#D97706' },
  full: { label: 'Full', tone: 'text-full bg-full/10 border-full/25', dot: 'bg-full', hex: '#B91C1C' },
  na: { label: 'Not offered', tone: 'text-faint bg-sunken border-line', dot: 'bg-faint', hex: '#A8A29E' },
}

/** How many months ahead ECDA's listing covers, counting the current month. */
export const VACANCY_MONTHS = 7

/**
 * Which slot in ECDA's seven month vacancy array a start date falls in. The first
 * slot is the month the centre last updated its listing. Null means the start date
 * is outside what ECDA publishes.
 */
export function vacancyIndex(ecdaUpdatedOn: string | null, startDate: string): number | null {
  if (!ecdaUpdatedOn) return null
  const base = parse(ecdaUpdatedOn)
  const start = parse(startDate)
  if (!base || !start) return null
  const diff = (start.getUTCFullYear() - base.getUTCFullYear()) * 12 + (start.getUTCMonth() - base.getUTCMonth())
  if (diff < 0) return 0
  return diff < VACANCY_MONTHS ? diff : null
}

export function vacancyFor(
  vacancy: VacancyMap,
  ecdaUpdatedOn: string | null,
  level: Level,
  startDate: string
): Vacancy | null {
  const months = vacancy[level]
  if (!months || months.length === 0) return null
  if (months.every((v) => v === 'na')) return 'na'
  const i = vacancyIndex(ecdaUpdatedOn, startDate)
  return i == null ? null : months[i] ?? null
}

/** Month labels for the seven slots, e.g. ["Nov", "Dec", "Jan", ...]. */
export function vacancyMonths(ecdaUpdatedOn: string | null): { key: string; label: string; year: number }[] {
  const base = ecdaUpdatedOn ? parse(ecdaUpdatedOn) : null
  if (!base) return []
  return Array.from({ length: VACANCY_MONTHS }, (_, i) => {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + i, 1))
    return {
      key: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en-SG', { month: 'short', timeZone: 'UTC' }),
      year: d.getUTCFullYear(),
    }
  })
}

export function offersLevel(vacancy: VacancyMap, level: Level): boolean {
  const months = vacancy[level]
  return !!months && months.some((v) => v !== 'na')
}
