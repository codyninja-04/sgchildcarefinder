'use client'

import { LEVELS, LEVEL_META } from '@/lib/levels'
import { RADIUS_OPTIONS, type SchemeFilter, type SortKey } from '@/lib/search'
import type { Level, Programme } from '@/lib/types'

export interface Filters {
  q: string
  level: Level
  startDate: string
  programme: Programme
  radiusKm: number
  scheme: SchemeFilter
  hideFull: boolean
  sort: SortKey
}

export function FilterBar({
  filters,
  onChange,
  levelFromProfile,
}: {
  filters: Filters
  onChange: (next: Partial<Filters>) => void
  levelFromProfile: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr]">
        <label className="block">
          <span className="label">Class</span>
          <select className="input mt-1.5" value={filters.level} onChange={(e) => onChange({ level: e.target.value as Level })}>
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {LEVEL_META[level].label} ({LEVEL_META[level].ages})
              </option>
            ))}
          </select>
          {levelFromProfile && <span className="mt-1 block text-[11px] text-faint">Worked out from your child’s birth date</span>}
        </label>
        <label className="block">
          <span className="label">Start date</span>
          <input type="date" className="input mt-1.5" value={filters.startDate} onChange={(e) => e.target.value && onChange({ startDate: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Within</span>
          <select className="input mt-1.5" value={filters.radiusKm} onChange={(e) => onChange({ radiusKm: Number(e.target.value) })}>
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r} km
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="seg" role="group" aria-label="Operator">
          {(
            [
              ['all', 'All centres'],
              ['government', 'Anchor + partner'],
              ['anchor', 'Anchor only'],
            ] as [SchemeFilter, string][]
          ).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={filters.scheme === value} onClick={() => onChange({ scheme: value })}>
              {label}
            </button>
          ))}
        </div>

        <div className="seg" role="group" aria-label="Programme">
          {(
            [
              ['full_day', 'Full day'],
              ['half_day', 'Half day'],
            ] as [Programme, string][]
          ).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={filters.programme === value} onClick={() => onChange({ programme: value })}>
              {label}
            </button>
          ))}
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm">
          <input type="checkbox" className="h-3.5 w-3.5 accent-[rgb(var(--primary))]" checked={filters.hideFull} onChange={(e) => onChange({ hideFull: e.target.checked })} />
          Hide full
        </label>

        <label className="ml-auto inline-flex items-center gap-2 text-sm text-muted">
          Sort
          <select className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink" value={filters.sort} onChange={(e) => onChange({ sort: e.target.value as SortKey })}>
            <option value="distance">Nearest</option>
            <option value="net_fee">Lowest fee after subsidy</option>
            <option value="vacancy">Most likely to have space</option>
          </select>
        </label>
      </div>
    </div>
  )
}
