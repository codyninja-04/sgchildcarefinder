import type { Metadata } from 'next'
import { ClearData } from '@/components/settings/ClearData'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { requireUser } from '@/lib/auth'

export const metadata: Metadata = { title: 'Family details' }

export default async function SettingsPage({ searchParams }: { searchParams: { welcome?: string } }) {
  const { profile } = await requireUser()
  const welcome = searchParams.welcome === '1'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <p className="label">{welcome ? 'Two minutes, once' : 'Family details'}</p>
      <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
        {welcome ? 'Tell us a little about your family' : 'Family details'}
      </h1>
      <p className="mt-2 max-w-xl text-muted">
        With these, every centre shows the right class, the vacancy for your start month, and what you’d actually pay after
        subsidy.
      </p>

      <div className="mt-8 space-y-6">
        <SettingsForm profile={profile} welcome={welcome} />
        {!welcome && <ClearData />}
      </div>
    </div>
  )
}
