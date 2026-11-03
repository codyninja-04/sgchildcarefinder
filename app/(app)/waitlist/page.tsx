import type { Metadata } from 'next'
import { WaitlistBoard } from '@/components/waitlist/WaitlistBoard'
import { FREE_LIMITS, proEnforced, requireUser } from '@/lib/auth'
import { loadWaitlist } from '@/lib/waitlist-db'

export const metadata: Metadata = { title: 'Waitlists' }

export default async function WaitlistPage({ searchParams }: { searchParams: { add?: string } }) {
  const { supabase, user, profile } = await requireUser()
  const entries = await loadWaitlist(supabase, user.id).catch(() => [])

  let preset: { id: string; name: string; address: string } | null = null
  if (searchParams.add && !entries.some((e) => e.centre_id === searchParams.add)) {
    const { data } = await supabase.from('childcare_centres').select('id, name, address').eq('id', searchParams.add).maybeSingle()
    preset = data
  }

  return (
    <WaitlistBoard
      initial={entries}
      preset={preset}
      defaults={{ childName: profile.child_name, startDate: profile.desired_start_date }}
      childBirthDate={profile.child_birth_date}
      limit={proEnforced() && profile.plan !== 'pro' ? FREE_LIMITS.waitlistEntries : null}
    />
  )
}
