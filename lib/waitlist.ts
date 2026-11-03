// Pure helpers for the waitlist board: status styling, what needs attention
// today, and the order entries show up in.

import { daysBetween, todayIso } from './format'
import { vacancyFor } from './levels'
import type { Level, Vacancy, WaitlistEntryWithCentre, WaitlistStatus } from './types'

export const STATUS_META: Record<WaitlistStatus, { label: string; tone: string; dot: string; hint: string }> = {
  waiting: { label: 'Waiting', tone: 'text-waiting bg-waiting/10 border-waiting/30', dot: 'bg-waiting', hint: 'Registered, no offer yet' },
  offered: { label: 'Offered', tone: 'text-offered bg-offered/10 border-offered/30', dot: 'bg-offered', hint: 'They have a place for you' },
  accepted: { label: 'Accepted', tone: 'text-white bg-offered border-offered', dot: 'bg-offered', hint: 'You took the place' },
  declined: { label: 'Declined', tone: 'text-muted bg-sunken border-line', dot: 'bg-faint', hint: 'You turned the offer down' },
  withdrawn: { label: 'Withdrawn', tone: 'text-faint bg-sunken/60 border-line', dot: 'bg-faint', hint: 'You came off the list' },
}

export const ACTIVE: WaitlistStatus[] = ['offered', 'waiting', 'accepted']

export type Attention =
  | { kind: 'offer_deadline'; days: number }
  | { kind: 'follow_up'; days: number }
  | { kind: 'stale'; days: number }
  | { kind: 'vacancy_opened'; vacancy: Vacancy }

/** Things worth flagging on an entry today, most urgent first. */
export function attentionFor(entry: WaitlistEntryWithCentre, level: Level | null, today = todayIso()): Attention[] {
  const out: Attention[] = []
  if (entry.status === 'offered' && entry.offer_deadline) {
    const days = daysBetween(today, entry.offer_deadline)
    if (days <= 7) out.push({ kind: 'offer_deadline', days })
  }
  if ((entry.status === 'waiting' || entry.status === 'offered') && entry.follow_up_on) {
    const days = daysBetween(today, entry.follow_up_on)
    if (days <= 0) out.push({ kind: 'follow_up', days })
  }
  if (entry.status === 'waiting') {
    const lastTouch = [entry.updated_at.slice(0, 10), ...entry.events.map((e) => e.created_at.slice(0, 10))].sort().pop()!
    const quiet = daysBetween(lastTouch, today)
    if (quiet >= 30 && !entry.follow_up_on) out.push({ kind: 'stale', days: quiet })
    if (level && entry.desired_start_date) {
      const v = vacancyFor(entry.centre.vacancy ?? {}, entry.centre.ecda_updated_on, level, entry.desired_start_date)
      if (v === 'available') out.push({ kind: 'vacancy_opened', vacancy: v })
    }
  }
  return out
}

export function attentionText(a: Attention): string {
  switch (a.kind) {
    case 'offer_deadline':
      return a.days < 0 ? `Offer deadline passed ${-a.days} day${a.days === -1 ? '' : 's'} ago` : a.days === 0 ? 'Reply to the offer today' : `Reply to the offer within ${a.days} day${a.days === 1 ? '' : 's'}`
    case 'follow_up':
      return a.days === 0 ? 'Follow up today' : `Follow up was due ${-a.days} day${a.days === -1 ? '' : 's'} ago`
    case 'stale':
      return `No contact in ${a.days} days. Worth a call to stay on their radar`
    case 'vacancy_opened':
      return 'ECDA now shows space for your start month. Call and ask'
  }
}

const STATUS_ORDER: Record<WaitlistStatus, number> = { offered: 0, waiting: 1, accepted: 2, declined: 3, withdrawn: 4 }

export function sortEntries(entries: WaitlistEntryWithCentre[]): WaitlistEntryWithCentre[] {
  return [...entries].sort((a, b) => {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (s) return s
    if (a.status === 'offered' && a.offer_deadline && b.offer_deadline) return a.offer_deadline.localeCompare(b.offer_deadline)
    return (a.registered_date ?? a.created_at).localeCompare(b.registered_date ?? b.created_at)
  })
}

export function countByStatus(entries: { status: WaitlistStatus }[]) {
  const counts: Record<WaitlistStatus, number> = { waiting: 0, offered: 0, accepted: 0, declined: 0, withdrawn: 0 }
  for (const e of entries) counts[e.status]++
  return counts
}

export function daysOnList(entry: { registered_date: string | null; created_at: string }, today = todayIso()) {
  return Math.max(0, daysBetween((entry.registered_date ?? entry.created_at).slice(0, 10), today))
}
