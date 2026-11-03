import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { STATUS_META } from '@/lib/waitlist'
import { WAITLIST_SELECT } from '@/lib/waitlist-db'
import { parseWaitlistInput } from '@/lib/validate'
import type { WaitlistStatus } from '@/lib/types'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = parseWaitlistInput(body, true)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  delete parsed.value.centre_id

  const { data: before } = await supabase.from('waitlist_entries').select('status').eq('id', params.id).eq('user_id', user.id).maybeSingle()
  if (!before) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const { data, error } = await supabase
    .from('waitlist_entries')
    .update(parsed.value)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select(WAITLIST_SELECT)
    .single()
  if (error) return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 })

  // Every status change goes in the log, so the history reads like a timeline.
  const next = parsed.value.status as WaitlistStatus | undefined
  if (next && next !== before.status) {
    const note = typeof body?.status_note === 'string' ? body.status_note.trim().slice(0, 500) : ''
    await supabase.from('waitlist_events').insert({
      entry_id: params.id,
      user_id: user.id,
      kind: 'status',
      status: next,
      body: note || `Marked as ${STATUS_META[next].label.toLowerCase()}`,
    })
    const { data: fresh } = await supabase.from('waitlist_entries').select(WAITLIST_SELECT).eq('id', params.id).single()
    return NextResponse.json({ entry: fresh ?? data })
  }

  return NextResponse.json({ entry: data })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const { error } = await supabase.from('waitlist_entries').delete().eq('id', params.id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: 'Could not remove it. Try again.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
