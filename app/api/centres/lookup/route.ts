import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

// Name or postal code lookup across the whole directory, for the "track a centre"
// form. Unlike search it ignores distance and class, since you may have registered
// somewhere near work or for a younger sibling.
export async function GET(request: Request) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 80)
  if (q.length < 2) return NextResponse.json({ centres: [] })

  const safe = q.replace(/[%_,()]/g, ' ')
  const digits = safe.replace(/\D/g, '')
  const filter = digits.length === 6 ? `postal_code.eq.${digits}` : `name.ilike.%${safe}%,address.ilike.%${safe}%`

  const { data, error } = await supabase.from('childcare_centres').select('id, name, address').or(filter).order('name').limit(10)
  if (error) return NextResponse.json({ error: 'Lookup failed.' }, { status: 500 })
  return NextResponse.json({ centres: data ?? [] })
}
