'use client'

import { useMemo, useState } from 'react'
import { SubsidyEstimate } from '@/components/centre/SubsidyEstimate'
import { RichText } from '@/components/ui/RichText'
import { money, monthYear } from '@/lib/format'
import { NEW_RATES_FROM, estimateSubsidy, subsidyTable, type CareKind, type SubsidyInput } from '@/lib/subsidy'
import type { Citizenship, Programme } from '@/lib/types'

const EXAMPLE_FEE: Record<CareKind, number> = { infant: 1300, childcare: 750 }

export function SubsidyCalculator({ initial }: { initial: SubsidyInput }) {
  const [input, setInput] = useState(initial)
  const [feeText, setFeeText] = useState(String(initial.monthlyFee))
  const [explaining, setExplaining] = useState(false)
  const [explanation, setExplanation] = useState<{ text: string; tips: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = (next: Partial<SubsidyInput>) => {
    setInput((i) => ({ ...i, ...next }))
    setExplanation(null)
  }

  const result = useMemo(() => estimateSubsidy(input), [input])
  const other = useMemo(() => {
    // The same family under the other year's rates, to show what 1 Jan 2027 changes.
    const otherStart = result.rateYear === 2026 ? NEW_RATES_FROM : '2026-12-01'
    return estimateSubsidy({ ...input, startDate: otherStart })
  }, [input, result.rateYear])
  const table = subsidyTable(result.rateYear, input.care, input.programme)
  const diff = result.net - other.net

  async function explain() {
    setExplaining(true)
    setError(null)
    const res = await fetch('/api/subsidy/calculate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...input, explain: true }),
    })
    const json = await res.json()
    setExplaining(false)
    if (!res.ok || !json.explanation) {
      setError(json.error ?? 'Could not explain this just now.')
      return
    }
    setExplanation({ text: json.explanation, tips: json.tips ?? [] })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="card space-y-5 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="label">Care</span>
            <div className="seg mt-1.5 flex" role="group" aria-label="Care">
              {(
                [
                  ['infant', 'Infant care'],
                  ['childcare', 'Childcare'],
                ] as [CareKind, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="flex-1"
                  aria-pressed={input.care === value}
                  onClick={() => {
                    const fee = input.monthlyFee === EXAMPLE_FEE[input.care] ? EXAMPLE_FEE[value] : input.monthlyFee
                    setFeeText(String(fee))
                    set({ care: value, monthlyFee: fee })
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Programme</span>
            <div className="seg mt-1.5 flex" role="group" aria-label="Programme">
              {(
                [
                  ['full_day', 'Full day'],
                  ['half_day', 'Half day'],
                ] as [Programme, string][]
              ).map(([value, label]) => (
                <button key={value} type="button" className="flex-1" aria-pressed={input.programme === value} onClick={() => set({ programme: value })}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Money label="Centre’s monthly fee" hint="Before subsidy, with GST" value={feeText} onChange={(v) => {
            setFeeText(v)
            set({ monthlyFee: Number(v || 0) })
          }} />
          <Money
            label="Gross household income"
            hint="Monthly, both parents"
            value={input.householdIncome?.toString() ?? ''}
            onChange={(v) => set({ householdIncome: v === '' ? null : Number(v) })}
          />
          <label className="block">
            <span className="text-sm font-medium">People in the household</span>
            <input inputMode="numeric" className="input mt-1.5" value={input.householdSize ?? ''} placeholder="3" onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '')
              set({ householdSize: v === '' ? null : Number(v) })
            }} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Start date</span>
            <input type="date" className="input mt-1.5" value={input.startDate ?? ''} onChange={(e) => set({ startDate: e.target.value || null })} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Child’s citizenship</span>
            <select className="input mt-1.5" value={input.citizenship} onChange={(e) => set({ citizenship: e.target.value as Citizenship })}>
              <option value="citizen">Singapore Citizen</option>
              <option value="pr">Permanent Resident</option>
              <option value="other">Other pass</option>
            </select>
          </label>
          <label className="flex cursor-pointer items-start gap-3 self-end rounded-xl border border-line p-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[rgb(var(--primary))]" checked={input.isWorking} onChange={(e) => set({ isWorking: e.target.checked })} />
            Mother works 56+ hours a month
          </label>
        </div>

        <div>
          <p className="label">{result.rateYear} rates, {input.care === 'infant' ? 'infant care' : 'childcare'} {input.programme === 'full_day' ? 'full day' : 'half day'}</p>
          <div className="-mx-1 mt-2 overflow-x-auto px-1">
            <table className="w-full min-w-[360px] text-sm">
              <thead>
                <tr className="text-left text-xs text-faint">
                  <th className="pb-1.5 font-normal">Household income</th>
                  <th className="pb-1.5 text-right font-normal">Basic</th>
                  <th className="pb-1.5 text-right font-normal">Max additional</th>
                  <th className="pb-1.5 text-right font-normal">Min co-pay</th>
                </tr>
              </thead>
              <tbody>
                {table.map((row, i) => (
                  <tr key={row.label} className={`border-t border-line/70 ${result.band === i ? 'bg-primary/[0.06] font-medium' : ''}`}>
                    <td className="py-1.5">{row.label}</td>
                    <td className="py-1.5 text-right">{money(row.basic)}</td>
                    <td className="py-1.5 text-right">{money(row.maxAdditional)}</td>
                    <td className="py-1.5 text-right">{money(row.minCopay)}</td>
                  </tr>
                ))}
                <tr className={`border-t border-line/70 text-muted ${result.eligible && result.band == null && input.householdIncome != null && input.isWorking ? 'bg-primary/[0.06] font-medium text-ink' : ''}`}>
                  <td className="py-1.5">Above that</td>
                  <td className="py-1.5 text-right">{money(table[0].basic)}</td>
                  <td className="py-1.5 text-right">–</td>
                  <td className="py-1.5 text-right">–</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-faint">From ECDA’s subsidy tables, updated 6 Oct 2026. Non working applicants get a $150 Basic Subsidy.</p>
        </div>
      </section>

      <div className="space-y-6">
        <section className="card p-5 sm:p-6">
          <SubsidyEstimate result={result} levelLabel={input.care === 'infant' ? 'Infant care' : 'Childcare'} />

          {result.eligible && (result.rateYear === 2026 ? diff !== 0 : diff < 0) && (
            <p className="mt-4 rounded-xl border border-line bg-sunken/50 px-4 py-3 text-sm">
              {result.rateYear === 2026 ? (
                <>
                  Starting from {monthYear(NEW_RATES_FROM)} instead, you’d pay <strong>{money(other.net)}</strong>,{' '}
                  {diff > 0 ? `${money(diff)} less` : `${money(-diff)} more`} a month under the wider 2027 bands.
                </>
              ) : (
                <>
                  The 2027 bands save you <strong>{money(-diff)}</strong> a month compared with 2026 rates.
                </>
              )}
            </p>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl">In plain English</h2>
              <p className="mt-1 text-sm text-muted">Claude walks through these numbers and what could change them.</p>
            </div>
            <button className="btn-dark shrink-0" onClick={explain} disabled={explaining}>
              {explaining ? 'Thinking…' : explanation ? 'Explain again' : 'Explain this'}
            </button>
          </div>
          {explaining && (
            <div className="mt-5 space-y-2">
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-11/12" />
              <div className="skeleton h-3 w-4/5" />
            </div>
          )}
          {explanation && (
            <div className="mt-5 animate-fade-in">
              <RichText text={explanation.text} />
              {explanation.tips.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                  {explanation.tips.map((tip) => (
                    <li key={tip} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {tip}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {error && <p className="mt-4 text-sm text-full">{error}</p>}
        </section>
      </div>
    </div>
  )
}

function Money({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 text-sm font-medium">
        {label}
        <span className="text-[11px] font-normal text-faint">{hint}</span>
      </span>
      <span className="relative mt-1.5 block">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">$</span>
        <input inputMode="numeric" className="input pl-7" value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))} />
      </span>
    </label>
  )
}
