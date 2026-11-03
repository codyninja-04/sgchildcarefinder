import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { parseEventInput } from '@/lib/validate'

// Log a call, email, visit or note against an entry.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const parsed = parseEventInput(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data: entry } = await supabase.from('waitlist_entries').select('id').eq('id', params.id).eq('user_id', user.id).maybeSingle()
  if (!entry) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const { data, error } = await supabase
    .from('waitlist_events')
    .insert({ entry_id: params.id, user_id: user.id, ...parsed.value })
    .select('id, entry_id, created_at, kind, status, body')
    .single()
  if (error) return NextResponse.json({ error: 'Could not log that. Try again.' }, { status: 500 })

  // A logged contact counts as the follow up, so clear one that was due.
  await supabase.from('waitlist_entries').update({ follow_up_on: null }).eq('id', params.id).lte('follow_up_on', new Date().toISOString().slice(0, 10))

  return NextResponse.json({ event: data }, { status: 201 })
}
