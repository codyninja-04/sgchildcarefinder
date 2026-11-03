import { NextResponse } from 'next/server'
import { getUser, toProfile } from '@/lib/auth'
import { parseProfileInput } from '@/lib/validate'

export async function GET() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const { data } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle()
  return NextResponse.json({ profile: toProfile(user.id, data) })
}

export async function PUT(request: Request) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const parsed = parseProfileInput(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({ user_id: user.id, ...parsed.value }, { onConflict: 'user_id' })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: 'Could not save your details. Try again.' }, { status: 500 })

  return NextResponse.json({ profile: toProfile(user.id, data) })
}

// Wipes everything a parent has told us, but keeps the account so they can start over.
export async function DELETE() {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  await supabase.from('waitlist_entries').delete().eq('user_id', user.id)
  await supabase.from('qa_messages').delete().eq('user_id', user.id)
  await supabase
    .from('user_profiles')
    .update({
      home_address: null,
      home_postal_code: null,
      home_lat: null,
      home_lng: null,
      child_name: null,
      child_birth_date: null,
      desired_start_date: null,
      household_income_monthly: null,
      household_size: null,
      citizenship_status: null,
      is_working_mother: true,
    })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
