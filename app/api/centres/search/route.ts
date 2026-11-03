import { NextResponse } from 'next/server'
import { getUser, toProfile } from '@/lib/auth'
import { loadCandidates, readSearchParams } from '@/lib/centres'
import { rankCentres, summarise } from '@/lib/search'

export async function GET(request: Request) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const { data: profileRow } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle()
  const profile = toProfile(user.id, profileRow)
  const params = readSearchParams(new URL(request.url).searchParams, profile)

  if (!params.origin && !params.q) {
    return NextResponse.json({ results: [], summary: summarise([]), params, needsLocation: true })
  }

  try {
    const { centres, fees } = await loadCandidates(supabase, params)
    const results = rankCentres(centres, fees, params).slice(0, 150)
    return NextResponse.json({ results, summary: summarise(results), params, needsLocation: false })
  } catch {
    return NextResponse.json({ error: 'Search failed. Try again in a moment.' }, { status: 500 })
  }
}
