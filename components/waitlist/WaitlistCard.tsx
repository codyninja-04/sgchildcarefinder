'use client'

import Link from 'next/link'
import { useState } from 'react'
import { VacancyChip } from '@/components/centre/VacancyChip'
import { money, monthYear, relativeDays, shortDate } from '@/lib/format'
import { levelFor, vacancyFor } from '@/lib/levels'
import { STATUS_META, attentionFor, attentionText, daysOnList } from '@/lib/waitlist'
import type { WaitlistEntryWithCentre, WaitlistEvent, WaitlistEventKind, WaitlistStatus } from '@/lib/types'

const KIND_LABEL: Record<WaitlistEventKind, string> = { status: 'Status', call: 'Call', email: 'Email', visit: 'Visit', note: 'Note' }

export function WaitlistCard({
  entry,
  childBirthDate,
  onChange,
  onRemove,
}: {
  entry: WaitlistEntryWithCentre
  childBirthDate: string | null
  onChange: (entry: WaitlistEntryWithCentre) => void
  onRemove: (id: string) => void
}) {
  const [open, setOpen] = useState(entry.status === 'offered')
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logKind, setLogKind] = useState<Exclude<WaitlistEventKind, 'status'>>('call')
  const [logText, setLogText] = useState('')
  const draftFrom = (e: WaitlistEntryWithCentre) => ({
    queue_position: e.queue_position?.toString() ?? '',
    fee_quoted: e.fee_quoted?.toString() ?? '',
    offer_deadline: e.offer_deadline ?? '',
    follow_up_on: e.follow_up_on ?? '',
    desired_start_date: e.desired_start_date ?? '',
    notes: e.notes ?? '',
  })
  const [draft, setDraft] = useState(() => draftFrom(entry))

  const level = childBirthDate && entry.desired_start_date ? levelFor(childBirthDate, entry.desired_start_date) : null
  const lvl = level?.ok ? level.level : null
  const vacancy = lvl && entry.desired_start_date ? vacancyFor(entry.centre.vacancy ?? {}, entry.centre.ecda_updated_on, lvl, entry.desired_start_date) : null
  const flags = attentionFor(entry, lvl)
  const meta = STATUS_META[entry.status]
  const closed = entry.status === 'declined' || entry.status === 'withdrawn'

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/waitlist/${entry.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(json.error ?? 'Could not save.')
      return false
    }
    onChange(json.entry)
    return true
  }

  async function log(e: React.FormEvent) {
    e.preventDefault()
    if (!logText.trim()) return
    setBusy(true)
    const res = await fetch(`/api/waitlist/${entry.id}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: logKind, body: logText }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) {
      setError(json.error)
      return
    }
    setLogText('')
    const followUpDue = entry.follow_up_on && entry.follow_up_on <= new Date().toISOString().slice(0, 10)
    onChange({ ...entry, follow_up_on: followUpDue ? null : entry.follow_up_on, events: [json.event as WaitlistEvent, ...entry.events] })
  }

  async function remove() {
    if (!confirm(`Remove ${entry.centre.name} from your list? The log goes too.`)) return
    const res = await fetch(`/api/waitlist/${entry.id}`, { method: 'DELETE' })
    if (res.ok) onRemove(entry.id)
  }

  return (
    <article id={`entry-${entry.id}`} className={`card scroll-mt-24 overflow-hidden ${closed ? 'opacity-70' : ''}`}>
      {flags.length > 0 && (
        <div className={`border-b px-4 py-2 text-sm sm:px-5 ${flags[0].kind === 'vacancy_opened' ? 'border-offered/20 bg-offered/[0.07] text-offered' : 'border-waiting/25 bg-waiting/10 text-[rgb(146_64_14)]'}`}>
          {attentionText(flags[0])}
          {flags.length > 1 && <span className="opacity-70"> · +{flags.length - 1} more</span>}
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/centre/${entry.centre_id}`} className="font-medium leading-snug hover:text-primary">
              {entry.centre.name}
            </Link>
            <p className="mt-0.5 truncate text-sm text-muted">
              {entry.child_name ? `${entry.child_name} · ` : ''}
              {entry.desired_start_date ? `from ${monthYear(entry.desired_start_date)}` : 'start date not set'}
            </p>
          </div>
          <label className="relative shrink-0">
            <span className="sr-only">Status</span>
            <select
              value={entry.status}
              disabled={busy}
              onChange={(e) => patch({ status: e.target.value as WaitlistStatus })}
              className={`chip cursor-pointer appearance-none py-1 pl-2 pr-6 text-[11px] ${meta.tone}`}
            >
              {(Object.keys(STATUS_META) as WaitlistStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
            <svg viewBox="0 0 12 12" className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2" fill="currentColor" aria-hidden>
              <path d="M2 4l4 4 4-4z" />
            </svg>
          </label>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
          <Stat label="On the list" value={`${daysOnList(entry)} days`} sub={entry.registered_date ? `since ${shortDate(entry.registered_date)}` : undefined} />
          <Stat label="Queue" value={entry.queue_position ? `#${entry.queue_position}` : '–'} />
          <Stat label="Fee quoted" value={money(entry.fee_quoted)} />
          {entry.status === 'offered' && entry.offer_deadline ? (
            <Stat label="Reply by" value={shortDate(entry.offer_deadline)} sub={relativeDays(entry.offer_deadline)} />
          ) : (
            <Stat label="Follow up" value={entry.follow_up_on ? shortDate(entry.follow_up_on) : '–'} sub={entry.follow_up_on ? relativeDays(entry.follow_up_on) : undefined} />
          )}
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {lvl && entry.desired_start_date && <VacancyChip vacancy={vacancy} month={monthYear(entry.desired_start_date).split(' ')[0]} />}
          {entry.centre.phone && (
            <a href={`tel:${entry.centre.phone.replace(/\s/g, '')}`} className="chip border-line text-muted hover:text-ink">
              Call {entry.centre.phone}
            </a>
          )}
          <button type="button" onClick={() => setOpen((o) => !o)} className="ml-auto text-sm text-muted hover:text-ink" aria-expanded={open}>
            {open ? 'Hide log' : `Log${entry.events.length ? ` (${entry.events.length})` : ''}`}
          </button>
          <button type="button" onClick={() => {
              if (!editing) setDraft(draftFrom(entry))
              setEditing((v) => !v)
            }} className="text-sm text-muted hover:text-ink">
            {editing ? 'Close' : 'Edit'}
          </button>
        </div>

        {entry.notes && !editing && <p className="mt-3 whitespace-pre-line rounded-xl bg-sunken/50 px-3 py-2 text-sm text-muted">{entry.notes}</p>}

        {editing && (
          <form
            className="mt-4 grid animate-fade-in grid-cols-2 gap-3 border-t border-line pt-4"
            onSubmit={async (e) => {
              e.preventDefault()
              if (await patch(draft)) setEditing(false)
            }}
          >
            <Input label="Place in queue" value={draft.queue_position} onChange={(v) => setDraft({ ...draft, queue_position: v.replace(/\D/g, '') })} />
            <Input label="Fee quoted" value={draft.fee_quoted} onChange={(v) => setDraft({ ...draft, fee_quoted: v.replace(/\D/g, '') })} />
            <Input label="Wanted start" type="date" value={draft.desired_start_date} onChange={(v) => setDraft({ ...draft, desired_start_date: v })} />
            <Input label="Follow up on" type="date" value={draft.follow_up_on} onChange={(v) => setDraft({ ...draft, follow_up_on: v })} />
            {entry.status === 'offered' && <Input label="Reply by" type="date" value={draft.offer_deadline} onChange={(v) => setDraft({ ...draft, offer_deadline: v })} />}
            <label className="col-span-2 block text-sm font-medium">
              Notes
              <textarea className="input mt-1.5 min-h-[72px] font-normal" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </label>
            <div className="col-span-2 flex items-center gap-2">
              <button className="btn-primary px-3 py-2" disabled={busy}>
                Save
              </button>
              <button type="button" className="ml-auto text-sm text-full hover:underline" onClick={remove}>
                Remove from list
              </button>
            </div>
          </form>
        )}

        {open && (
          <div className="mt-4 animate-fade-in border-t border-line pt-4">
            <form onSubmit={log} className="flex flex-col gap-2 sm:flex-row">
              <select className="input sm:w-28" value={logKind} onChange={(e) => setLogKind(e.target.value as typeof logKind)} aria-label="What happened">
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="visit">Visit</option>
                <option value="note">Note</option>
              </select>
              <input className="input flex-1" value={logText} onChange={(e) => setLogText(e.target.value)} placeholder="e.g. Spoke to Ms Tan, now 6th in line" />
              <button className="btn-dark" disabled={busy || !logText.trim()}>
                Log
              </button>
            </form>
            {entry.events.length > 0 ? (
              <ol className="mt-4 space-y-3">
                {entry.events.map((ev) => (
                  <li key={ev.id} className="flex gap-3 text-sm">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ev.status ? STATUS_META[ev.status].dot : 'bg-faint'}`} />
                    <div className="min-w-0">
                      <p>
                        <span className="font-medium">{ev.kind === 'status' && ev.status ? STATUS_META[ev.status].label : KIND_LABEL[ev.kind]}</span>
                        {ev.body && <span className="text-muted"> · {ev.body}</span>}
                      </p>
                      <p className="text-xs text-faint">{shortDate(ev.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-faint">Nothing logged yet.</p>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-full">{error}</p>}
      </div>
    </article>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="mt-1 font-medium">
        {value}
        {sub && <span className="block text-xs font-normal text-faint">{sub}</span>}
      </dd>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input type={type} inputMode={type === 'text' ? 'numeric' : undefined} className="input mt-1.5 font-normal" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
