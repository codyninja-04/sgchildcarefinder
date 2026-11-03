import { LEVEL_META, levelFor, monthsBetween } from './levels'
import type { Level, Profile } from './types'

export function money(value: number | null | undefined, opts: { blank?: string } = {}): string {
  if (value == null || Number.isNaN(value)) return opts.blank ?? '–'
  return `$${Math.round(value).toLocaleString('en-SG')}`
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return '–'
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function monthYear(value: string | null | undefined): string {
  if (!value) return '–'
  const d = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return d.toLocaleDateString('en-SG', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export function todayIso(): string {
  // Singapore time, so "today" flips at midnight here rather than in UTC.
  return new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10)
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from.slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${to.slice(0, 10)}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

export function relativeDays(date: string | null | undefined, today = todayIso()): string {
  if (!date) return ''
  const d = daysBetween(today, date)
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d === -1) return 'yesterday'
  if (d > 0) return `in ${d} days`
  return `${-d} days ago`
}

export function ageLabel(birthDate: string, on = todayIso()): string {
  const birth = new Date(`${birthDate}T00:00:00Z`)
  const at = new Date(`${on}T00:00:00Z`)
  if (birth > at) return 'due ' + monthYear(birthDate)
  const months = monthsBetween(birth, at)
  if (months < 1) return 'newborn'
  if (months < 24) return `${months} month${months === 1 ? '' : 's'}`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'}`
}

/** The level, start date and child the app searches for by default. */
export function searchContext(profile: Profile): { level: Level; startDate: string; fromProfile: boolean } {
  const fallbackStart = nextMonthStart()
  const startDate = profile.desired_start_date ?? fallbackStart
  if (profile.child_birth_date) {
    const r = levelFor(profile.child_birth_date, startDate)
    if (r.ok) return { level: r.level, startDate, fromProfile: true }
  }
  return { level: 'infant', startDate, fromProfile: false }
}

export function nextMonthStart(today = todayIso()): string {
  const d = new Date(`${today}T00:00:00Z`)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10)
}

export function childLine(profile: Profile): string | null {
  if (!profile.child_birth_date) return null
  const { level, startDate } = searchContext(profile)
  const who = profile.child_name || 'Your child'
  return `${who}, ${LEVEL_META[level].label.toLowerCase()} from ${monthYear(startDate)}`
}
