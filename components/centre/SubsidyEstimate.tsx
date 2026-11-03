import Link from 'next/link'
import { money } from '@/lib/format'
import type { SubsidyResult } from '@/lib/subsidy'

/** The fee as a bar: what the government covers, and what's left for you. */
export function SubsidyEstimate({ result, levelLabel }: { result: SubsidyResult; levelLabel: string }) {
  const { fee, basic, additional, net } = result
  const pct = (v: number) => (fee > 0 ? `${(v / fee) * 100}%` : '0%')

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="label">You’d pay, {levelLabel.toLowerCase()}</p>
          <p className="mt-1 font-display text-4xl leading-none">{money(net)}</p>
          <p className="mt-1.5 text-sm text-muted">a month, from a {money(fee)} fee</p>
        </div>
        {result.total > 0 && (
          <p className="text-right text-sm text-offered">
            {money(result.total)}
            <span className="block text-xs text-muted">in subsidy</span>
          </p>
        )}
      </div>

      <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-sunken" role="img" aria-label={`Basic ${money(basic)}, additional ${money(additional)}, you pay ${money(net)}`}>
        <span className="h-full bg-offered" style={{ width: pct(basic) }} />
        <span className="h-full bg-offered/50" style={{ width: pct(additional) }} />
        <span className="h-full bg-primary" style={{ width: pct(net) }} />
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <Row dot="bg-offered" label="Basic Subsidy" value={money(basic)} />
        <Row
          dot="bg-offered/50"
          label={`Additional Subsidy${result.bandLabel ? ` (${result.bandLabel})` : ''}`}
          value={money(additional)}
        />
        <Row dot="bg-primary" label="You pay" value={money(net)} strong />
      </dl>

      {result.notes.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-xs text-muted">
          {result.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <Link href="/subsidy" className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline">
        See how this is worked out
      </Link>
    </div>
  )
}

function Row({ dot, label, value, strong }: { dot: string; label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-muted">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </dt>
      <dd className={strong ? 'font-semibold' : ''}>{value}</dd>
    </div>
  )
}
