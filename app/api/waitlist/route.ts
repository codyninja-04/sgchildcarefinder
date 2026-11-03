import { NextResponse } from 'next/server'
import { FREE_LIMITS, getUser, proEnforced } from '@/lib/auth'
import { WAITLIST_SELECT, loadWaitlist } from '@/lib/waitlist-db'
import { parseWaitlistInput } from '@/lib/validate'

export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  try {
    return NextResponse.json({ entries: await loadWaitlist(supabase, user.id) })
  } catch {
    return NextResponse.json({ error: 'Could not load your waitlists.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const parsed = parseWaitlistInput(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  if (proEnforced()) {
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from('user_profiles').select('plan').eq('user_id', user.id).maybeSingle(),
      supabase.from('waitlist_entries').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    if (profile?.plan !== 'pro' && (count ?? 0) >= FREE_LIMITS.waitlistEntries) {
      return NextResponse.json(
        { error: `The free plan tracks ${FREE_LIMITS.waitlistEntries} centres. Pro tracks as many as you like for $4 a month.`, upgrade: true },
        { status: 402 }
      )
    }
  }

  const { data: centre } = await supabase.from('childcare_centres').select('id').eq('id', parsed.value.centre_id as string).maybeSingle()
  if (!centre) return NextResponse.json({ error: 'That centre is not in the directory.' }, { status: 404 })

  const { data, error } = await supabase
    .from('waitlist_entries')
    .insert({ ...parsed.value, user_id: user.id })
    .select(WAITLIST_SELECT)
    .single()

  if (error) {
    const duplicate = error.code === '23505'
    return NextResponse.json(
      { error: duplicate ? 'You’re already tracking this centre for that child.' : 'Could not save. Try again.' },
      { status: duplicate ? 409 : 500 }
    )
  }

  await supabase.from('waitlist_events').insert({
    entry_id: data.id,
    user_id: user.id,
    kind: 'status',
    status: data.status,
    body: data.registered_date ? `Registered on ${data.registered_date}` : 'Added to your list',
  })

  const { data: fresh } = await supabase.from('waitlist_entries').select(WAITLIST_SELECT).eq('id', data.id).single()
  return NextResponse.json({ entry: fresh ?? data }, { status: 201 })
}
