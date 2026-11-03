import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { claudeConfigured } from '@/lib/claude/client'
import { explainSubsidy } from '@/lib/claude/subsidy-explainer'
import { estimateSubsidy, type SubsidyInput } from '@/lib/subsidy'
import type { Citizenship, Programme } from '@/lib/types'

function readInput(body: Record<string, unknown>): SubsidyInput | null {
  const fee = Number(body.monthlyFee)
  if (!Number.isFinite(fee) || fee < 0 || fee > 20_000) return null
  const income = body.householdIncome == null || body.householdIncome === '' ? null : Number(body.householdIncome)
  if (income != null && (!Number.isFinite(income) || income < 0 || income > 1_000_000)) return null
  const size = body.householdSize == null || body.householdSize === '' ? null : Math.round(Number(body.householdSize))
  const start = typeof body.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate) ? body.startDate : null

  return {
    care: body.care === 'infant' ? 'infant' : 'childcare',
    programme: (body.programme === 'half_day' ? 'half_day' : 'full_day') as Programme,
    monthlyFee: fee,
    isWorking: body.isWorking !== false,
    householdIncome: income,
    householdSize: size && size > 0 && size <= 20 ? size : null,
    citizenship: (['citizen', 'pr', 'other'].includes(body.citizenship as string) ? body.citizenship : 'citizen') as Citizenship,
    startDate: start,
  }
}

// Always returns our own numbers. With explain: true, Claude adds a plain English
// walk through of those numbers and a few things worth checking.
export async function POST(request: Request) {
  const { user } = await getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const input = body ? readInput(body) : null
  if (!input) return NextResponse.json({ error: 'Check the fee and income amounts.' }, { status: 400 })

  const result = estimateSubsidy(input)
  if (!body?.explain) return NextResponse.json({ result })

  if (!claudeConfigured()) {
    return NextResponse.json({ result, error: 'The explainer needs ANTHROPIC_API_KEY set on the server.' }, { status: 503 })
  }

  try {
    const explanation = await explainSubsidy(input, result)
    return NextResponse.json({ result, ...explanation })
  } catch {
    return NextResponse.json({ result, error: 'Claude could not explain this just now. The numbers above are still right.' }, { status: 502 })
  }
}
