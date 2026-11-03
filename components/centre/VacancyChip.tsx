import { VACANCY_META } from '@/lib/levels'
import type { Vacancy } from '@/lib/types'

export function VacancyChip({ vacancy, month }: { vacancy: Vacancy | null; month?: string }) {
  if (!vacancy) {
    return <span className="chip border-line bg-sunken/60 text-faint">No ECDA data{month ? ` for ${month}` : ''}</span>
  }
  const meta = VACANCY_META[vacancy]
  return (
    <span className={`chip ${meta.tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
      {month && vacancy !== 'na' ? ` · ${month}` : ''}
    </span>
  )
}

export function SchemeChip({ scheme }: { scheme: 'anchor' | 'partner' | null }) {
  if (!scheme) return null
  return (
    <span
      className="chip border-primary/25 bg-primary/[0.06] text-primary"
      title={scheme === 'anchor' ? 'Anchor Operator: government funded, fees capped' : 'Partner Operator: government supported, fees capped'}
    >
      {scheme === 'anchor' ? 'Anchor operator' : 'Partner operator'}
    </span>
  )
}
