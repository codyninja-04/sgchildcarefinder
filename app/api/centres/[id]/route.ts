import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { CENTRE_COLUMNS, normaliseCentre } from '@/lib/centres'
import type { CentreFee } from '@/lib/types'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const { data, error } = await supabase.from('childcare_centres').select(CENTRE_COLUMNS).eq('id', params.id).maybeSingle()
  if (error || !data) return NextResponse.json({ error: 'Centre not found.' }, { status: 404 })

  const { data: fees } = await supabase
    .from('centre_fees')
    .select('centre_id, level, programme, citizenship, monthly_fee')
    .eq('centre_id', params.id)

  return NextResponse.json({ centre: normaliseCentre(data as Record<string, unknown>), fees: (fees ?? []) as CentreFee[] })
}
