import { LEVELS, LEVEL_META, VACANCY_META, offersLevel, vacancyIndex, vacancyMonths } from '@/lib/levels'
import { shortDate } from '@/lib/format'
import type { Level, VacancyMap } from '@/lib/types'

// Seven months by six levels, straight from ECDA. The row for your child and the
// column for your start month are picked out so the answer jumps off the grid.
export function VacancyGrid({
  vacancy,
  ecdaUpdatedOn,
  level,
  startDate,
}: {
  vacancy: VacancyMap
  ecdaUpdatedOn: string | null
  level: Level
  startDate: string
}) {
  const months = vacancyMonths(ecdaUpdatedOn)
  const startIndex = vacancyIndex(ecdaUpdatedOn, startDate)
  const levels = LEVELS.filter((l) => offersLevel(vacancy, l))

  if (!months.length || !levels.length) {
    return <p className="text-sm text-muted">This centre hasn’t published vacancy to ECDA. Call to ask.</p>
  }

  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <table className="w-full min-w-[520px] border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="w-32 text-left font-normal text-faint" />
              {months.map((m, i) => (
                <th key={m.key} className={`pb-1 text-center font-mono font-normal uppercase tracking-wider ${i === startIndex ? 'text-primary' : 'text-faint'}`}>
                  {m.label}
                  {(i === 0 || m.label === 'Jan') && <span className="block text-[9px] opacity-70">{m.year}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map((l) => {
              const mine = l === level
              return (
                <tr key={l}>
                  <th scope="row" className={`pr-2 text-left font-normal ${mine ? 'font-medium text-ink' : 'text-muted'}`}>
                    {LEVEL_META[l].label}
                    {mine && <span className="ml-1 text-primary">·</span>}
                  </th>
                  {(vacancy[l] ?? []).map((v, i) => {
                    const meta = VACANCY_META[v]
                    const focus = mine && i === startIndex
                    return (
                      <td key={i} className="p-0">
                        <span
                          title={`${LEVEL_META[l].label}, ${months[i]?.label}: ${meta.label}`}
                          className={`flex h-8 items-center justify-center rounded-md border text-[10px] font-medium ${meta.tone} ${mine ? '' : 'opacity-60'} ${
                            focus ? 'ring-2 ring-primary ring-offset-1' : ''
                          }`}
                        >
                          {v === 'available' ? 'Open' : v === 'limited' ? 'Few' : v === 'full' ? 'Full' : '–'}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-faint">
        From ECDA’s listing{ecdaUpdatedOn ? `, updated by the centre on ${shortDate(ecdaUpdatedOn)}` : ''}. Centres report this
        themselves, so treat it as a guide and confirm on the phone.
      </p>
    </div>
  )
}
