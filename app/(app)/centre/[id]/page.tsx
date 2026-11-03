import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CallChecklist } from '@/components/centre/CallChecklist'
import { FeeBreakdown } from '@/components/centre/FeeBreakdown'
import { SubsidyEstimate } from '@/components/centre/SubsidyEstimate'
import { VacancyGrid } from '@/components/centre/VacancyGrid'
import { SchemeChip, VacancyChip } from '@/components/centre/VacancyChip'
import { requireUser } from '@/lib/auth'
import { CENTRE_COLUMNS, normaliseCentre } from '@/lib/centres'
import { monthYear, searchContext, shortDate } from '@/lib/format'
import { distanceKm, formatDistance } from '@/lib/geo'
import { LEVELS, LEVEL_META, vacancyFor } from '@/lib/levels'
import { feeFor } from '@/lib/search'
import { careKindForLevel, estimateSubsidy } from '@/lib/subsidy'
import type { CentreFee, Level, Programme } from '@/lib/types'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { supabase } = await requireUser()
  const { data } = await supabase.from('childcare_centres').select('name').eq('id', params.id).maybeSingle()
  return { title: data?.name ?? 'Centre' }
}

const STATUS_LABEL = { waiting: 'Waiting', offered: 'Offered', accepted: 'Accepted', declined: 'Declined', withdrawn: 'Withdrawn' } as const

export default async function CentrePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { level?: string; start?: string; programme?: string }
}) {
  const { supabase, user, profile } = await requireUser()

  const [{ data: row }, { data: feeRows }, { data: entry }] = await Promise.all([
    supabase.from('childcare_centres').select(CENTRE_COLUMNS).eq('id', params.id).maybeSingle(),
    supabase.from('centre_fees').select('centre_id, level, programme, citizenship, monthly_fee').eq('centre_id', params.id),
    supabase.from('waitlist_entries').select('id, status, queue_position').eq('user_id', user.id).eq('centre_id', params.id).maybeSingle(),
  ])
  if (!row) notFound()

  const centre = normaliseCentre(row as Record<string, unknown>)
  const fees = (feeRows ?? []) as CentreFee[]
  const ctx = searchContext(profile)
  const level = LEVELS.includes(searchParams.level as Level) ? (searchParams.level as Level) : ctx.level
  const startDate = searchParams.start && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.start) ? searchParams.start : ctx.startDate
  const programme: Programme = searchParams.programme === 'half_day' ? 'half_day' : 'full_day'
  const citizenship = profile.citizenship_status ?? 'citizen'

  const fee = feeFor(fees, centre.id, level, programme, citizenship)
  const estimate =
    fee != null
      ? estimateSubsidy({
          care: careKindForLevel(level),
          programme,
          monthlyFee: fee,
          isWorking: profile.is_working_mother,
          householdIncome: profile.household_income_monthly,
          householdSize: profile.household_size,
          citizenship: centre.government_subsidy ? citizenship : 'other',
          startDate,
        })
      : null

  const vacancy = vacancyFor(centre.vacancy, centre.ecda_updated_on, level, startDate)
  const distance =
    profile.home_lat != null && profile.home_lng != null ? distanceKm({ lat: profile.home_lat, lng: profile.home_lng }, centre) : null
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${centre.lat},${centre.lng}`

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <Link href="/search" className="text-sm text-muted hover:text-ink">
        ← Back to search
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 max-w-2xl">
          <div className="flex flex-wrap gap-1.5">
            <VacancyChip vacancy={vacancy} month={monthYear(startDate)} />
            <SchemeChip scheme={centre.scheme_type} />
            {centre.spark_certified && <span className="chip border-line text-muted">SPARK certified</span>}
          </div>
          <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">{centre.name}</h1>
          <p className="mt-2 text-muted">
            {centre.address}
            {distance != null && <span className="text-faint"> · {formatDistance(distance)}</span>}
          </p>
          {centre.operator && centre.operator !== 'independent' && <p className="mt-1 text-sm text-faint">Run by {centre.operator}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          {entry ? (
            <Link href={`/waitlist#entry-${entry.id}`} className="btn-ghost">
              On your list · {STATUS_LABEL[entry.status as keyof typeof STATUS_LABEL]}
              {entry.queue_position ? ` #${entry.queue_position}` : ''}
            </Link>
          ) : (
            <Link href={`/waitlist?add=${centre.id}`} className="btn-primary">
              + Track this centre
            </Link>
          )}
          {centre.phone && (
            <a href={`tel:${centre.phone.replace(/\s/g, '')}`} className="btn-ghost">
              Call {centre.phone}
            </a>
          )}
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-xl">Vacancy, next seven months</h2>
            <p className="mt-1 text-sm text-muted">
              Your child’s row is {LEVEL_META[level].label.toLowerCase()}, starting {monthYear(startDate)}.
            </p>
            <div className="mt-5">
              <VacancyGrid vacancy={centre.vacancy} ecdaUpdatedOn={centre.ecda_updated_on} level={level} startDate={startDate} />
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-xl">Fees</h2>
            <div className="mt-4">
              <FeeBreakdown fees={fees} profile={profile} level={level} startDate={startDate} subsidised={centre.government_subsidy} />
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-xl">Before you call</h2>
            <p className="mt-1 text-sm text-muted">Tick them off as you go. Log the answers on your waitlist so you can compare later.</p>
            <div className="mt-4">
              <CallChecklist centreId={centre.id} />
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5 sm:p-6">
            {estimate ? (
              <SubsidyEstimate result={estimate} levelLabel={LEVEL_META[level].label} />
            ) : (
              <p className="text-sm text-muted">
                No {programme === 'full_day' ? 'full day' : 'half day'} fee listed for {LEVEL_META[level].label.toLowerCase()} here.
              </p>
            )}
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="font-display text-xl">Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Detail label="Weekdays" value={centre.operating_hours} />
              <Detail label="Saturdays" value={centre.saturday_hours} />
              <Detail label="Extended hours" value={centre.extended_hours ? 'Yes' : 'No'} />
              <Detail label="Second languages" value={centre.languages.join(', ') || null} />
              <Detail label="Food" value={centre.food_offered} />
              <Detail label="Transport" value={centre.provides_transport ? 'Offered' : 'Not offered'} />
              <Detail label="Government subsidy" value={centre.government_subsidy ? 'Yes' : 'No'} />
              <Detail label="ECDA code" value={centre.centre_code} mono />
            </dl>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4 text-sm">
              <a href={directions} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-1.5">
                Directions
              </a>
              {centre.email && (
                <a href={`mailto:${centre.email}`} className="btn-ghost px-3 py-1.5">
                  Email
                </a>
              )}
              {centre.website && (
                <a href={centre.website} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-1.5">
                  Website
                </a>
              )}
            </div>
            {centre.geocode_precision === 'approximate' && (
              <p className="mt-3 text-xs text-faint">Map position is approximate for this address.</p>
            )}
            <p className="mt-3 text-xs text-faint">Data from ECDA via data.gov.sg, last refreshed {shortDate(centre.updated_at)}.</p>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Detail({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={`text-right ${mono ? 'font-mono text-xs' : ''}`}>{value ?? '–'}</dd>
    </div>
  )
}
