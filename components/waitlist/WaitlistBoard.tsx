'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ACTIVE, STATUS_META, attentionFor, countByStatus, sortEntries } from '@/lib/waitlist'
import { levelFor } from '@/lib/levels'
import type { WaitlistEntryWithCentre, WaitlistStatus } from '@/lib/types'
import { AddToWaitlistForm } from './AddToWaitlistForm'
import { WaitlistCard } from './WaitlistCard'

export function WaitlistBoard({
  initial,
  preset,
  defaults,
  childBirthDate,
  limit,
}: {
  initial: WaitlistEntryWithCentre[]
  preset: { id: string; name: string; address: string } | null
  defaults: { childName: string | null; startDate: string | null }
  childBirthDate: string | null
  limit: number | null
}) {
  const router = useRouter()
  const [entries, setEntries] = useState(initial)
  const [adding, setAdding] = useState(!!preset)
  const [tab, setTab] = useState<'active' | 'closed'>('active')

  const counts = countByStatus(entries)
  const sorted = useMemo(() => sortEntries(entries), [entries])
  const shown = sorted.filter((e) => (tab === 'active' ? ACTIVE.includes(e.status) : !ACTIVE.includes(e.status)))
  const atLimit = limit != null && entries.length >= limit

  const attention = entries.filter((e) => {
    const lvl = childBirthDate && e.desired_start_date ? levelFor(childBirthDate, e.desired_start_date) : null
    return attentionFor(e, lvl?.ok ? lvl.level : null).length > 0
  }).length

  function closeForm() {
    setAdding(false)
    if (preset) router.replace('/waitlist', { scroll: false })
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Your registrations</p>
          <h1 className="mt-1.5 font-display text-3xl tracking-tight sm:text-4xl">Waitlists</h1>
          <p className="mt-2 max-w-lg text-muted">Every centre you’ve registered at, in one place instead of a spreadsheet.</p>
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)} disabled={atLimit}>
          + Track a centre
        </button>
      </div>

      {entries.length > 0 && (
        <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {(Object.keys(STATUS_META) as WaitlistStatus[]).map((s, i) => (
            <div key={s} className={`card p-3 ${i > 2 ? 'hidden sm:block' : ''}`}>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
                {STATUS_META[s].label}
              </p>
              <p className="mt-1 font-display text-2xl">{counts[s]}</p>
            </div>
          ))}
        </div>
      )}

      {attention > 0 && (
        <p className="mt-4 rounded-xl border border-waiting/30 bg-waiting/10 px-4 py-3 text-sm">
          {attention} centre{attention === 1 ? ' needs' : 's need'} something from you. They’re flagged below.
        </p>
      )}

      {atLimit && (
        <p className="mt-4 rounded-xl border border-primary/25 bg-primary/[0.05] px-4 py-3 text-sm">
          You’re tracking {limit} centres, the most on the free plan. Pro tracks as many as you like for $4 a month.
        </p>
      )}

      {entries.length === 0 ? (
        <div className="dotted mt-8 rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="font-display text-2xl">Nothing tracked yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Most parents register at four to eight centres. Add each one here as you go, then log every call so you know
            exactly where you stand.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button className="btn-primary" onClick={() => setAdding(true)}>
              Track a centre
            </button>
            <Link href="/search" className="btn-ghost">
              Find centres first
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="seg mt-8" role="group" aria-label="Show">
            <button type="button" aria-pressed={tab === 'active'} onClick={() => setTab('active')}>
              Active ({counts.waiting + counts.offered + counts.accepted})
            </button>
            <button type="button" aria-pressed={tab === 'closed'} onClick={() => setTab('closed')}>
              Closed ({counts.declined + counts.withdrawn})
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {shown.map((entry) => (
              <WaitlistCard
                key={entry.id}
                entry={entry}
                childBirthDate={childBirthDate}
                onChange={(next) => setEntries((list) => list.map((e) => (e.id === next.id ? next : e)))}
                onRemove={(id) => setEntries((list) => list.filter((e) => e.id !== id))}
              />
            ))}
            {shown.length === 0 && <p className="py-8 text-center text-sm text-muted">Nothing here.</p>}
          </div>
        </>
      )}

      <p className="mt-10 text-xs text-faint">
        This list is for your own tracking. It does not register you with any centre. Register directly with the centre or
        through LifeSG.
      </p>

      {adding && (
        <AddToWaitlistForm
          preset={preset}
          defaults={defaults}
          onClose={closeForm}
          onSaved={(entry) => {
            setEntries((list) => [{ ...entry, events: entry.events ?? [] }, ...list])
            setTab('active')
            closeForm()
          }}
        />
      )}
    </div>
  )
}
