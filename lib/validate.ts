// Small hand written validators for the API routes. The payloads are tiny and
// fixed, so a schema library would be more weight than help.

import type { Citizenship, WaitlistEventKind, WaitlistStatus } from './types'

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

const DATE = /^\d{4}-\d{2}-\d{2}$/
const CITIZENSHIP: Citizenship[] = ['citizen', 'pr', 'other']
export const STATUSES: WaitlistStatus[] = ['waiting', 'offered', 'accepted', 'declined', 'withdrawn']
export const EVENT_KINDS: WaitlistEventKind[] = ['status', 'call', 'email', 'visit', 'note']

function str(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const s = value.trim().slice(0, max)
  return s || null
}

function date(value: unknown): string | null | undefined {
  if (value === null || value === '' || value === undefined) return null
  if (typeof value !== 'string' || !DATE.test(value) || Number.isNaN(Date.parse(value))) return undefined
  return value
}

function int(value: unknown, min: number, max: number): number | null | undefined {
  if (value === null || value === '' || value === undefined) return null
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[$,\s]/g, ''))
  if (!Number.isFinite(n) || n < min || n > max) return undefined
  return Math.round(n)
}

function num(value: unknown): number | null {
  const n = Number(value)
  return value == null || value === '' || !Number.isFinite(n) ? null : n
}

export function parseProfileInput(body: unknown) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Nothing to save.' } as Result<never>
  const b = body as Record<string, unknown>

  const birth = date(b.child_birth_date)
  const start = date(b.desired_start_date)
  const income = int(b.household_income_monthly, 0, 1_000_000)
  const size = int(b.household_size, 1, 20)
  if (birth === undefined) return { ok: false, error: 'Birth date should look like 2026-03-14.' } as Result<never>
  if (start === undefined) return { ok: false, error: 'Start date should look like 2027-01-04.' } as Result<never>
  if (income === undefined) return { ok: false, error: 'Household income should be a monthly amount in dollars.' } as Result<never>
  if (size === undefined) return { ok: false, error: 'Household size should be between 1 and 20.' } as Result<never>

  const citizenship = CITIZENSHIP.includes(b.citizenship_status as Citizenship) ? (b.citizenship_status as Citizenship) : null
  const lat = num(b.home_lat)
  const lng = num(b.home_lng)
  const inSingapore = lat != null && lng != null && lat > 1.15 && lat < 1.48 && lng > 103.6 && lng < 104.1

  const value = {
    full_name: str(b.full_name, 80),
    child_name: str(b.child_name, 60),
    child_birth_date: birth,
    desired_start_date: start,
    household_income_monthly: income,
    household_size: size,
    is_working_mother: b.is_working_mother !== false,
    citizenship_status: citizenship,
    home_address: str(b.home_address, 200),
    home_postal_code: str(b.home_postal_code, 6),
    home_lat: inSingapore ? lat : null,
    home_lng: inSingapore ? lng : null,
  }
  return { ok: true, value } as Result<typeof value>
}

export function parseWaitlistInput(body: unknown, partial = false) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Nothing to save.' } as Result<never>
  const b = body as Record<string, unknown>
  const out: Record<string, unknown> = {}

  if (!partial || 'centre_id' in b) {
    const centre = str(b.centre_id, 64)
    if (!centre) return { ok: false, error: 'Pick a centre first.' } as Result<never>
    out.centre_id = centre
  }

  for (const key of ['desired_start_date', 'registered_date', 'offer_deadline', 'follow_up_on'] as const) {
    if (partial && !(key in b)) continue
    const d = date(b[key])
    if (d === undefined) return { ok: false, error: `${key.replace(/_/g, ' ')} is not a valid date.` } as Result<never>
    out[key] = d
  }

  if (!partial || 'status' in b) {
    const status = (b.status ?? 'waiting') as WaitlistStatus
    if (!STATUSES.includes(status)) return { ok: false, error: 'Unknown status.' } as Result<never>
    out.status = status
  }

  if (!partial || 'queue_position' in b) {
    const pos = int(b.queue_position, 1, 10_000)
    if (pos === undefined) return { ok: false, error: 'Queue position should be a whole number.' } as Result<never>
    out.queue_position = pos
  }

  if (!partial || 'fee_quoted' in b) {
    const fee = int(b.fee_quoted, 0, 20_000)
    if (fee === undefined) return { ok: false, error: 'Fee should be a monthly amount in dollars.' } as Result<never>
    out.fee_quoted = fee
  }

  if (!partial || 'child_name' in b) out.child_name = str(b.child_name, 60)
  if (!partial || 'notes' in b) out.notes = str(b.notes, 2000)

  return { ok: true, value: out } as Result<Record<string, unknown>>
}

export function parseEventInput(body: unknown) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Nothing to log.' } as Result<never>
  const b = body as Record<string, unknown>
  const kind = b.kind as WaitlistEventKind
  if (!EVENT_KINDS.includes(kind) || kind === 'status') return { ok: false, error: 'Pick call, email, visit or note.' } as Result<never>
  const text = str(b.body, 1000)
  if (!text) return { ok: false, error: 'Write a line about what happened.' } as Result<never>
  return { ok: true, value: { kind, body: text } } as Result<{ kind: WaitlistEventKind; body: string }>
}
