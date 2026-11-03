'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { LEVEL_META, earliestInfantStart, levelFor } from '@/lib/levels'
import { ageLabel, monthYear } from '@/lib/format'
import { NEW_RATES_FROM, incomeCeiling, rateYearFor } from '@/lib/subsidy'
import type { Citizenship, Profile } from '@/lib/types'
import { AddressSearch } from './AddressSearch'

const CITIZENSHIP: { value: Citizenship; label: string }[] = [
  { value: 'citizen', label: 'Singapore Citizen' },
  { value: 'pr', label: 'Permanent Resident' },
  { value: 'other', label: 'Other pass' },
]

export function SettingsForm({ profile, welcome }: { profile: Profile; welcome: boolean }) {
  const router = useRouter()
  const [form, setForm] = useState(profile)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) => setForm((f) => ({ ...f, [key]: value }))

  const level = useMemo(() => {
    if (!form.child_birth_date || !form.desired_start_date) return null
    return levelFor(form.child_birth_date, form.desired_start_date)
  }, [form.child_birth_date, form.desired_start_date])

  const year = rateYearFor(form.desired_start_date)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) {
      setMessage({ tone: 'error', text: json.error ?? 'Could not save.' })
      return
    }
    setForm(json.profile)
    setMessage({ tone: 'ok', text: 'Saved. Search and fee estimates now use these details.' })
    router.refresh()
    if (welcome) router.push('/search')
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-xl">Your child</h2>
        <p className="mt-1 text-sm text-muted">Used to work out which class they’d join and which vacancy to show you.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Name or nickname" hint="Optional">
            <input className="input" value={form.child_name ?? ''} onChange={(e) => set('child_name', e.target.value)} placeholder="e.g. Ethan" />
          </Field>
          <Field label="Birth date" hint="Or the due date">
            <input type="date" className="input" value={form.child_birth_date ?? ''} onChange={(e) => set('child_birth_date', e.target.value || null)} />
          </Field>
          <Field label="When you’d like them to start">
            <input
              type="date"
              className="input"
              value={form.desired_start_date ?? ''}
              min={form.child_birth_date ? earliestInfantStart(form.child_birth_date) ?? undefined : undefined}
              onChange={(e) => set('desired_start_date', e.target.value || null)}
            />
          </Field>
          <Field label="Child’s citizenship">
            <select className="input" value={form.citizenship_status ?? ''} onChange={(e) => set('citizenship_status', (e.target.value || null) as Citizenship | null)}>
              <option value="">Choose one</option>
              {CITIZENSHIP.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {level && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${level.ok ? 'border-primary/20 bg-primary/[0.05]' : 'border-waiting/30 bg-waiting/10'}`}>
            {level.ok ? (
              <>
                {form.child_name || 'Your child'} would be <strong>{ageLabel(form.child_birth_date!, form.desired_start_date!)}</strong> in{' '}
                {monthYear(form.desired_start_date)}, so they’d join <strong>{LEVEL_META[level.level].label}</strong>.
              </>
            ) : level.reason === 'too_young' ? (
              <>Infant care starts from two months old. The earliest start would be {monthYear(earliestInfantStart(form.child_birth_date!))}.</>
            ) : level.reason === 'school_age' ? (
              <>By then they’d be in primary school. This app covers infant care up to K2.</>
            ) : (
              <>Check the dates above.</>
            )}
          </div>
        )}
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-xl">Home</h2>
        <p className="mt-1 text-sm text-muted">Search sorts centres by distance from here. Use your workplace if that’s where pickups happen.</p>
        <div className="mt-5">
          <AddressSearch
            value={form.home_address ?? ''}
            onPick={(place) =>
              setForm((f) => ({ ...f, home_address: place.address, home_postal_code: place.postal, home_lat: place.lat, home_lng: place.lng }))
            }
          />
          {form.home_lat != null && <p className="mt-2 text-xs text-offered">Location set.</p>}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-xl">Subsidy details</h2>
        <p className="mt-1 text-sm text-muted">
          These only feed the fee estimate. ECDA checks the real numbers when you apply through LifeSG.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Gross monthly household income" hint="Both parents, before CPF">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">$</span>
              <input
                inputMode="numeric"
                className="input pl-7"
                value={form.household_income_monthly ?? ''}
                onChange={(e) => set('household_income_monthly', e.target.value === '' ? null : Number(e.target.value.replace(/\D/g, '')))}
                placeholder="8500"
              />
            </div>
          </Field>
          <Field label="People in the household" hint="Counts for per capita income at 5 or more">
            <input
              inputMode="numeric"
              className="input"
              value={form.household_size ?? ''}
              onChange={(e) => set('household_size', e.target.value === '' ? null : Number(e.target.value.replace(/\D/g, '')))}
              placeholder="3"
            />
          </Field>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 transition hover:bg-sunken/40">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[rgb(var(--primary))]" checked={form.is_working_mother} onChange={(e) => set('is_working_mother', e.target.checked)} />
          <span className="text-sm">
            <span className="font-medium">The mother is working at least 56 hours a month</span>
            <span className="mt-0.5 block text-muted">Full time, part time and freelance all count. For a single father, tick this if he is working.</span>
          </span>
        </label>

        <p className="mt-4 text-xs text-faint">
          Additional Subsidy covers household incomes up to ${incomeCeiling(year).toLocaleString('en-SG')} for a {year} start
          {year === 2026 ? `, rising to $15,000 for starts from ${monthYear(NEW_RATES_FROM)}` : ''}.
        </p>
      </section>

      <div className="sticky bottom-20 z-20 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-background/90 p-3 backdrop-blur lg:bottom-4">
        <button className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : welcome ? 'Save and find centres' : 'Save details'}
        </button>
        {message && (
          <p role="status" className={`text-sm ${message.tone === 'ok' ? 'text-offered' : 'text-full'}`}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-sm font-medium">
        {label}
        {hint && <span className="text-xs font-normal text-faint">{hint}</span>}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}
