import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { searchOneMap } from '@/lib/onemap'

// Address lookup for the home address box. Proxied so the browser never depends
// on OneMap's CORS rules, and so we can cache popular lookups at the edge.
export async function GET(request: Request) {
  const { user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (q.length < 3) return NextResponse.json({ places: [] })

  try {
    const places = (await searchOneMap(q)).slice(0, 6)
    return NextResponse.json({ places }, { headers: { 'cache-control': 'private, max-age=3600' } })
  } catch {
    return NextResponse.json({ places: [], error: 'Address search is not responding. Try a postal code.' }, { status: 502 })
  }
}
