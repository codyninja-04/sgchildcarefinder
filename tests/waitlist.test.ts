import { describe, expect, it } from 'vitest'
import { attentionFor, attentionText, countByStatus, daysOnList, sortEntries } from '@/lib/waitlist'
import { parseEventInput, parseWaitlistInput } from '@/lib/validate'
import type { Vacancy, WaitlistEntryWithCentre } from '@/lib/types'

const today = '2026-11-03'

function entry(id: string, over: Partial<WaitlistEntryWithCentre> = {}): WaitlistEntryWithCentre {
  return {
    id,
    user_id: 'u',
    centre_id: `c-${id}`,
    created_at: '2026-09-01T02:00:00Z',
    updated_at: '2026-10-28T02:00:00Z',
    child_name: 'Mei',
    desired_start_date: '2027-01-04',
    registered_date: '2026-09-01',
    status: 'waiting',
    queue_position: null,
    fee_quoted: null,
    offer_deadline: null,
    follow_up_on: null,
    notes: null,
    centre: {
      id: `c-${id}`,
      name: `Centre ${id}`,
      operator: null,
      address: '',
      phone: null,
      scheme_type: null,
      vacancy: { infant: Array<Vacancy>(7).fill('full') },
      ecda_updated_on: '2026-11-02',
    },
    events: [],
    ...over,
  }
}

describe('attentionFor', () => {
  it('flags an offer that needs a reply this week', () => {
    const flags = attentionFor(entry('a', { status: 'offered', offer_deadline: '2026-11-06' }), 'infant', today)
    expect(flags[0]).toEqual({ kind: 'offer_deadline', days: 3 })
    expect(attentionText(flags[0])).toBe('Reply to the offer within 3 days')
  })

  it('flags a follow up that is due', () => {
    expect(attentionFor(entry('b', { follow_up_on: '2026-11-01' }), 'infant', today)[0]).toEqual({ kind: 'follow_up', days: -2 })
  })

  it('nudges when nothing has happened for a month', () => {
    const quiet = entry('c', { updated_at: '2026-09-20T00:00:00Z' })
    expect(attentionFor(quiet, 'infant', today).map((f) => f.kind)).toContain('stale')
  })

  it('stays quiet when there was a recent call', () => {
    const called = entry('d', {
      updated_at: '2026-09-20T00:00:00Z',
      events: [{ id: 'e', entry_id: 'd', created_at: '2026-10-30T00:00:00Z', kind: 'call', status: null, body: 'still 6th' }],
    })
    expect(attentionFor(called, 'infant', today)).toEqual([])
  })

  it('points out when ECDA shows space for the start month', () => {
    const open = entry('e', {
      centre: { ...entry('x').centre, vacancy: { infant: ['full', 'full', 'available', 'full', 'full', 'full', 'full'] } },
    })
    expect(attentionFor(open, 'infant', today).map((f) => f.kind)).toContain('vacancy_opened')
  })

  it('ignores closed entries', () => {
    expect(attentionFor(entry('f', { status: 'withdrawn', follow_up_on: '2026-10-01' }), 'infant', today)).toEqual([])
  })
})

describe('board helpers', () => {
  it('puts offers first, soonest deadline first', () => {
    const list = sortEntries([
      entry('w'),
      entry('o2', { status: 'offered', offer_deadline: '2026-11-20' }),
      entry('x', { status: 'declined' }),
      entry('o1', { status: 'offered', offer_deadline: '2026-11-08' }),
    ])
    expect(list.map((e) => e.id)).toEqual(['o1', 'o2', 'w', 'x'])
  })

  it('counts by status', () => {
    expect(countByStatus([entry('a'), entry('b', { status: 'offered' })])).toMatchObject({ waiting: 1, offered: 1 })
  })

  it('counts days on the list from the registration date', () => {
    expect(daysOnList(entry('a'), today)).toBe(63)
  })
})

describe('validation', () => {
  it('accepts a new entry with blanks', () => {
    const r = parseWaitlistInput({ centre_id: 'abc', queue_position: '', fee_quoted: '1,240', registered_date: '2026-11-03', offer_deadline: '' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toMatchObject({ centre_id: 'abc', queue_position: null, fee_quoted: 1240, status: 'waiting', offer_deadline: null })
  })

  it('rejects bad dates and statuses', () => {
    expect(parseWaitlistInput({ centre_id: 'abc', registered_date: '3/11/2026' }).ok).toBe(false)
    expect(parseWaitlistInput({ centre_id: 'abc', status: 'maybe' }).ok).toBe(false)
  })

  it('only touches the fields sent in a partial update', () => {
    const r = parseWaitlistInput({ status: 'offered' }, true)
    expect(r.ok && Object.keys(r.value)).toEqual(['status'])
  })

  it('checks log entries', () => {
    expect(parseEventInput({ kind: 'call', body: '  Now 4th  ' })).toEqual({ ok: true, value: { kind: 'call', body: 'Now 4th' } })
    expect(parseEventInput({ kind: 'status', body: 'x' }).ok).toBe(false)
    expect(parseEventInput({ kind: 'note', body: '   ' }).ok).toBe(false)
  })
})
