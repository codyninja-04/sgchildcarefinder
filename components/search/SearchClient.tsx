'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AddressSearch } from '@/components/settings/AddressSearch'
import { money, monthYear } from '@/lib/format'
import { LEVEL_META, vacancyIndex } from '@/lib/levels'
import type { summarise } from '@/lib/search'
import type { CentreResult } from '@/lib/types'
import { CentreCard, CentreCardSkeleton } from './CentreCard'
import { FilterBar, type Filters } from './FilterBar'

const CentreMap = dynamic(() => import('./CentreMap'), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full rounded-2xl" />,
})

type Summary = ReturnType<typeof summarise>
type Origin = { lat: number; lng: number; label: string }

export function SearchClient({
  initialFilters,
  initialOrigin,
  levelFromProfile,
  trackedIds,
  ecdaUpdatedOn,
  hasIncome,
}: {
  initialFilters: Filters
  initialOrigin: Origin | null
  levelFromProfile: boolean
  trackedIds: string[]
  ecdaUpdatedOn: string | null
  hasIncome: boolean
}) {
  const router = useRouter()
  const [filters, setFilters] = useState(initialFilters)
  const [origin, setOrigin] = useState<Origin | null>(initialOrigin)
  const [results, setResults] = useState<CentreResult[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'list' | 'map'>('list')
  const [highlight, setHighlight] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const tracked = useMemo(() => new Set(trackedIds), [trackedIds])
  const request = useRef(0)

  const month = monthYear(filters.startDate)
  const detailQuery = `?level=${filters.level}&start=${filters.startDate}&programme=${filters.programme}`
  const outOfRange = ecdaUpdatedOn ? vacancyIndex(ecdaUpdatedOn, filters.startDate) == null : false

  const run = useCallback(async () => {
    const id = ++request.current
    setLoading(true)
    setError(null)
    const qs = new URLSearchParams({
      level: filters.level,
      start: filters.startDate,
      radius: String(filters.radiusKm),
      scheme: filters.scheme,
      sort: filters.sort,
      programme: filters.programme,
      hideFull: filters.hideFull ? '1' : '0',
    })
    if (filters.q) qs.set('q', filters.q)
    if (origin) {
      qs.set('lat', String(origin.lat))
      qs.set('lng', String(origin.lng))
    }
    try {
      const res = await fetch(`/api/centres/search?${qs}`)
      const json = await res.json()
      if (id !== request.current) return
      if (!res.ok) throw new Error(json.error)
      setResults(json.results)
      setSummary(json.summary)
    } catch (err) {
      if (id === request.current) setError((err as Error).message || 'Search failed.')
    } finally {
      if (id === request.current) setLoading(false)
    }
    // Keep the URL shareable and the back button honest.
    const url = new URLSearchParams(qs)
    url.delete('lat')
    url.delete('lng')
    router.replace(`/search?${url}`, { scroll: false })
  }, [filters, origin, router])

  useEffect(() => {
    const timer = setTimeout(run, filters.q ? 300 : 0)
    return () => clearTimeout(timer)
  }, [run, filters.q])

  function useMyLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Your current location' })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  function select(id: string) {
    setHighlight(id)
    if (view === 'map' && window.innerWidth < 1024) {
      router.push(`/centre/${id}${detailQuery}`)
      return
    }
    document.getElementById(`centre-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const showMap = !!origin

  return (
    <div className="px-4 py-6 sm:px-6 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label">{LEVEL_META[filters.level].label} · from {month}</p>
            <h1 className="mt-1.5 font-display text-3xl tracking-tight sm:text-4xl">Centres near you</h1>
          </div>
          {showMap && (
            <div className="seg lg:hidden" role="group" aria-label="View">
              <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
                List
              </button>
              <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>
                Map
              </button>
            </div>
          )}
        </div>

        <div className="card mt-5 space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
            <div>
              <span className="label">Near</span>
              <div className="mt-1.5 flex gap-2">
                <div className="min-w-0 flex-1">
                  <AddressSearch value={origin?.label ?? ''} onPick={(p) => setOrigin({ lat: p.lat, lng: p.lng, label: p.address })} />
                </div>
                <button type="button" className="btn-ghost shrink-0 px-3" onClick={useMyLocation} disabled={locating} title="Use my location">
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                    <circle cx="10" cy="10" r="3" />
                    <path d="M10 2v3M10 15v3M2 10h3M15 10h3" strokeLinecap="round" />
                  </svg>
                  <span className="hidden sm:inline">{locating ? 'Finding you…' : 'Here'}</span>
                </button>
              </div>
            </div>
            <label className="block">
              <span className="label">Name, operator or postal code</span>
              <input className="input mt-1.5" placeholder="e.g. Sparkletots, Punggol" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
            </label>
          </div>
          <FilterBar filters={filters} onChange={(next) => setFilters((f) => ({ ...f, ...next }))} levelFromProfile={levelFromProfile} />
        </div>

        {outOfRange && (
          <p className="mt-4 rounded-xl border border-waiting/30 bg-waiting/10 px-4 py-3 text-sm">
            ECDA only publishes vacancy seven months ahead, so there’s no indicator for {month} yet. Fees and subsidy are still
            shown, and most centres take registrations well before that.
          </p>
        )}

        {!origin && !filters.q ? (
          <EmptyLocation />
        ) : (
          <div className={`mt-6 grid gap-6 ${showMap ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]' : ''}`}>
            <section className={view === 'map' ? 'hidden lg:block' : ''} aria-live="polite">
              <ResultsHeader summary={summary} loading={loading} month={month} hasIncome={hasIncome} />
              {error && <p className="mt-4 rounded-xl border border-full/25 bg-full/5 px-4 py-3 text-sm text-full">{error}</p>}
              <div className="mt-4 space-y-3">
                {loading && results.length === 0
                  ? Array.from({ length: 5 }, (_, i) => <CentreCardSkeleton key={i} />)
                  : results.map((r, i) => (
                      <div key={r.centre.id} className="animate-rise-in" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                        <CentreCard result={r} month={month.split(' ')[0]} selected={highlight === r.centre.id} tracked={tracked.has(r.centre.id)} onHover={setHighlight} query={detailQuery} />
                      </div>
                    ))}
                {!loading && results.length === 0 && !error && <NoResults />}
              </div>
            </section>

            {showMap && (
              <section className={`${view === 'list' ? 'hidden lg:block' : ''} lg:sticky lg:top-6 lg:self-start`}>
                <div className="h-[calc(100vh-14rem)] min-h-[420px] lg:h-[calc(100vh-3rem)]">
                  <CentreMap results={results} origin={origin} radiusKm={filters.radiusKm} highlight={highlight} onSelect={select} />
                </div>
                <Legend />
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ResultsHeader({ summary, loading, month, hasIncome }: { summary: Summary | null; loading: boolean; month: string; hasIncome: boolean }) {
  if (!summary) return <div className="skeleton h-5 w-2/3" />
  return (
    <div className={`transition ${loading ? 'opacity-50' : ''}`}>
      <p className="text-sm">
        <strong>{summary.total}</strong> centre{summary.total === 1 ? '' : 's'}
        {summary.total > 0 && (
          <>
            {' · '}
            <span className="text-offered">{summary.available} with space</span>
            {', '}
            <span className="text-waiting">{summary.limited} limited</span> in {month.split(' ')[0]}
          </>
        )}
      </p>
      {summary.lowestNet != null && (
        <p className="mt-1 text-sm text-muted">
          After subsidy, from {money(summary.lowestNet)} a month. Typical is {money(summary.medianNet)}.
          {!hasIncome && (
            <>
              {' '}
              <Link href="/settings" className="text-primary underline-offset-4 hover:underline">
                Add your income
              </Link>{' '}
              to include Additional Subsidy.
            </>
          )}
        </p>
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-2 flex flex-wrap gap-3 px-1 text-xs text-muted">
      {[
        ['bg-offered', 'Available'],
        ['bg-waiting', 'Limited'],
        ['bg-full', 'Full'],
        ['bg-faint', 'No data'],
      ].map(([dot, label]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          {label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-ink ring-2 ring-primary/20" />
        Home
      </span>
    </div>
  )
}

function EmptyLocation() {
  return (
    <div className="dotted mt-6 rounded-2xl border border-dashed border-line px-6 py-16 text-center">
      <p className="font-display text-2xl">Where should we look?</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Type your postal code above, tap Here to use your location, or{' '}
        <Link href="/settings" className="text-primary underline-offset-4 hover:underline">
          save your home address
        </Link>{' '}
        so search starts there every time.
      </p>
    </div>
  )
}

function NoResults() {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <p className="font-medium">Nothing matches yet</p>
      <p className="mt-1 text-sm text-muted">Try a wider radius, switch off Hide full, or include private centres.</p>
    </div>
  )
}
