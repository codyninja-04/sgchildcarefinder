'use client'

import { useEffect, useState } from 'react'
import { todayIso } from '@/lib/format'
import { STATUS_META } from '@/lib/waitlist'
import type { WaitlistEntryWithCentre, WaitlistStatus } from '@/lib/types'

type Picked = { id: string; name: string; address: string }

/**
 * Logs a centre you've registered at. Nothing is sent to the centre: you still
 * register with them (or through LifeSG) yourself, this just keeps track.
 */
export function AddToWaitlistForm({
  preset,
  defaults,
  onClose,
  onSaved,
}: {
  preset: Picked | null
  defaults: { childName: string | null; startDate: string | null }
  onClose: () => void
  onSaved: (entry: WaitlistEntryWithCentre) => void
}) {
  const [centre, setCentre] = useState<Picked | null>(preset)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<Picked[]>([])
  const [form, setForm] = useState({
    child_name: defaults.childName ?? '',
    desired_start_date: defaults.startDate ?? '',
    registered_date: todayIso(),
    status: 'waiting' as WaitlistStatus,
    queue_position: '',
    fee_quoted: '',
    offer_deadline: '',
    follow_up_on: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (centre || query.trim().length < 2) {
      setMatches([])
      return
    }
    const controller = new AbortController()
    const t = setTimeout(async () => {
      const res = await fetch(`/api/centres/lookup?q=${encodeURIComponent(query)}`, { signal: controller.signal }).catch(() => null)
      if (!res?.ok) return
      const json = (await res.json()) as { centres: Picked[] }
      setMatches(json.centres)
    }, 250)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [query, centre])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!centre) {
      setError('Pick a centre first.')
      return
    }
    setSaving(true)
    setError(null)
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, centre_id: centre.id }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(json.error ?? 'Could not save.')
      return
    }
    onSaved(json.entry)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-title"
        className="max-h-[92vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 shadow-lift sm:animate-rise-in sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="add-title" className="font-display text-2xl">
              Track a centre
            </h2>
            <p className="mt-1 text-sm text-muted">For centres you’ve registered at. This doesn’t contact the centre.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-faint hover:bg-sunken hover:text-ink" aria-label="Close">
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M5 5l10 10M15 5 5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-5">
          <span className="text-sm font-medium">Centre</span>
          {centre ? (
            <div className="mt-1.5 flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/[0.04] px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{centre.name}</p>
                <p className="truncate text-xs text-muted">{centre.address}</p>
              </div>
              {!preset && (
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => setCentre(null)}>
                  Change
                </button>
              )}
            </div>
          ) : (
            <div className="relative mt-1.5">
              <input className="input" autoFocus placeholder="Search by name or postal code" value={query} onChange={(e) => setQuery(e.target.value)} />
              {matches.length > 0 && (
                <ul className="card absolute z-10 mt-1.5 max-h-64 w-full overflow-auto p-1">
                  {matches.map((m) => (
                    <li key={m.id}>
                      <button type="button" className="w-full rounded-lg px-3 py-2 text-left hover:bg-sunken" onClick={() => setCentre(m)}>
                        <span className="block text-sm">{m.name}</span>
                        <span className="block truncate text-xs text-muted">{m.address}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Child">
            <input className="input" value={form.child_name} onChange={(e) => set('child_name', e.target.value)} placeholder="Name" />
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {(Object.keys(STATUS_META) as WaitlistStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Registered on">
            <input type="date" className="input" value={form.registered_date} onChange={(e) => set('registered_date', e.target.value)} />
          </Field>
          <Field label="Wanted start">
            <input type="date" className="input" value={form.desired_start_date} onChange={(e) => set('desired_start_date', e.target.value)} />
          </Field>
          <Field label="Place in queue" hint="If they told you">
            <input inputMode="numeric" className="input" value={form.queue_position} onChange={(e) => set('queue_position', e.target.value.replace(/\D/g, ''))} placeholder="e.g. 8" />
          </Field>
          <Field label="Fee quoted" hint="Monthly">
            <input inputMode="numeric" className="input" value={form.fee_quoted} onChange={(e) => set('fee_quoted', e.target.value.replace(/\D/g, ''))} placeholder="$" />
          </Field>
          {form.status === 'offered' && (
            <Field label="Reply by">
              <input type="date" className="input" value={form.offer_deadline} onChange={(e) => set('offer_deadline', e.target.value)} />
            </Field>
          )}
          <Field label="Remind me to follow up">
            <input type="date" className="input" value={form.follow_up_on} onChange={(e) => set('follow_up_on', e.target.value)} />
          </Field>
        </div>

        <Field label="Notes" className="mt-3">
          <textarea className="input min-h-[80px]" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Who you spoke to, registration fee paid, anything to remember" />
        </Field>

        {error && <p role="alert" className="mt-3 text-sm text-full">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button className="btn-primary flex-1" disabled={saving}>
            {saving ? 'Saving…' : 'Add to my list'}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, hint, className = '', children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="flex items-baseline justify-between gap-2 text-sm font-medium">
        {label}
        {hint && <span className="text-[11px] font-normal text-faint">{hint}</span>}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}
