import { LEVELS, LEVEL_META } from '@/lib/levels'
import { money } from '@/lib/format'
import { careKindForLevel, estimateSubsidy } from '@/lib/subsidy'
import type { CentreFee, Citizenship, Level, Profile } from '@/lib/types'

const CITIZENSHIP_LABEL: Record<Citizenship, string> = {
  citizen: 'Singapore Citizen',
  pr: 'PR',
  other: 'other pass',
}

// Every level this centre lists with ECDA, full and half day, for your child's
// citizenship, with what you'd pay after subsidy next to it.
export function FeeBreakdown({
  fees,
  profile,
  level,
  startDate,
  subsidised,
}: {
  fees: CentreFee[]
  profile: Profile
  level: Level
  startDate: string
  subsidised: boolean
}) {
  const citizenship = profile.citizenship_status ?? 'citizen'
  const rows = LEVELS.map((l) => {
    const full = fees.find((f) => f.level === l && f.programme === 'full_day' && f.citizenship === citizenship)?.monthly_fee ?? null
    const half = fees.find((f) => f.level === l && f.programme === 'half_day' && f.citizenship === citizenship)?.monthly_fee ?? null
    const net = (fee: number | null, programme: 'full_day' | 'half_day') =>
      fee == null || !subsidised
        ? fee
        : estimateSubsidy({
            care: careKindForLevel(l),
            programme,
            monthlyFee: fee,
            isWorking: profile.is_working_mother,
            householdIncome: profile.household_income_monthly,
            householdSize: profile.household_size,
            citizenship,
            startDate,
          }).net
    return { level: l, full, half, fullNet: net(full, 'full_day'), halfNet: net(half, 'half_day') }
  }).filter((r) => r.full != null || r.half != null)

  if (!rows.length) {
    return <p className="text-sm text-muted">No fees listed with ECDA for {CITIZENSHIP_LABEL[citizenship]} children. Ask the centre directly.</p>
  }

  const anyHalf = rows.some((r) => r.half != null)

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="pb-2 font-normal text-faint">Monthly, {CITIZENSHIP_LABEL[citizenship]}</th>
            <th className="pb-2 text-right font-normal text-faint">Full day</th>
            {anyHalf && <th className="pb-2 text-right font-normal text-faint">Half day</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.level} className={`border-b border-line/60 last:border-0 ${r.level === level ? 'bg-primary/[0.04]' : ''}`}>
              <td className="py-2.5 pr-3">
                {LEVEL_META[r.level].label}
                {r.level === level && <span className="ml-2 chip border-primary/25 text-primary">Your child</span>}
              </td>
              <FeeCell fee={r.full} net={r.fullNet} />
              {anyHalf && <FeeCell fee={r.half} net={r.halfNet} />}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-faint">
        Fees include GST and come from ECDA’s listing. After subsidy uses your family details and ECDA’s{' '}
        {startDate >= '2027-01-01' ? '2027' : '2026'} tables.
        {!subsidised && ' This centre does not receive government subsidy, so you pay the full fee.'}
      </p>
    </div>
  )
}

function FeeCell({ fee, net }: { fee: number | null; net: number | null }) {
  if (fee == null) return <td className="py-2.5 text-right text-faint">–</td>
  return (
    <td className="py-2.5 text-right">
      <span className="font-medium">{money(net)}</span>
      {net !== fee && <span className="ml-1.5 text-xs text-faint line-through">{money(fee)}</span>}
    </td>
  )
}
