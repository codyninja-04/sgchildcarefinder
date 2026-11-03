import Link from 'next/link'
import { formatDistance, walkMinutes } from '@/lib/geo'
import { money } from '@/lib/format'
import type { CentreResult } from '@/lib/types'
import { SchemeChip, VacancyChip } from '../centre/VacancyChip'

export function CentreCard({
  result,
  month,
  selected,
  tracked,
  onHover,
  query = '',
}: {
  result: CentreResult
  month: string
  selected?: boolean
  tracked?: boolean
  onHover?: (id: string | null) => void
  query?: string
}) {
  const { centre, distance_km, fee, net_fee, subsidy } = result

  return (
    <Link
      href={`/centre/${centre.id}${query}`}
      id={`centre-${centre.id}`}
      onMouseEnter={() => onHover?.(centre.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`card group block p-4 transition hover:-translate-y-px hover:shadow-lift sm:p-5 ${selected ? 'ring-2 ring-primary/40' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-medium leading-snug group-hover:text-primary">{centre.name}</h3>
          <p className="mt-0.5 truncate text-sm text-muted">
            {distance_km != null && (
              <>
                {formatDistance(distance_km)}
                {distance_km < 2.5 && <span className="text-faint"> · {walkMinutes(distance_km)} min walk</span>}
                <span className="text-faint"> · </span>
              </>
            )}
            {centre.operator === 'independent' ? 'Independent' : centre.operator}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {net_fee != null ? (
            <>
              <p className="font-display text-xl leading-none">{money(net_fee)}</p>
              <p className="mt-1 text-[11px] text-faint">a month after subsidy</p>
            </>
          ) : (
            <p className="text-xs text-faint">Fee not listed</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <VacancyChip vacancy={result.vacancy} month={month} />
        <SchemeChip scheme={centre.scheme_type} />
        {centre.extended_hours && <span className="chip border-line text-muted">Extended hours</span>}
        {tracked && <span className="chip border-ink/15 bg-ink/5 text-ink">On your list</span>}
        {fee != null && subsidy != null && subsidy > 0 && (
          <span className="ml-auto text-xs text-faint">
            {money(fee)} less {money(subsidy)}
          </span>
        )}
      </div>
    </Link>
  )
}

export function CentreCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
        </div>
        <div className="skeleton h-6 w-16" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-4 w-20" />
      </div>
    </div>
  )
}
