import type { Metadata } from 'next'
import { SubsidyCalculator } from '@/components/subsidy/SubsidyCalculator'
import { requireUser } from '@/lib/auth'
import { searchContext } from '@/lib/format'

export const metadata: Metadata = { title: 'Subsidy calculator' }

export default async function SubsidyPage() {
  const { profile } = await requireUser()
  const ctx = searchContext(profile)
  const care = ctx.level === 'infant' ? 'infant' : 'childcare'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <p className="label">Basic and Additional Subsidy</p>
      <h1 className="mt-1.5 font-display text-3xl tracking-tight sm:text-4xl">What you’d actually pay</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Put in a centre’s fee and your household income. The maths follows ECDA’s published tables, including the wider bands
        that start on 1 Jan 2027. Working Mother’s Child Relief is a tax relief, so it doesn’t show up here.
      </p>

      <div className="mt-8">
        <SubsidyCalculator
          initial={{
            care,
            programme: 'full_day',
            monthlyFee: care === 'infant' ? 1300 : 750,
            isWorking: profile.is_working_mother,
            householdIncome: profile.household_income_monthly,
            householdSize: profile.household_size,
            citizenship: profile.citizenship_status ?? 'citizen',
            startDate: ctx.startDate,
          }}
        />
      </div>
    </div>
  )
}
