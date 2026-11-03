import { beforeEach, describe, expect, it, vi } from 'vitest'

const { create } = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create, stream: vi.fn() }
  },
}))

import { SG_CARE_FACTS, VERIFY_LINE } from '@/lib/claude/client'
import { careSystemPrompt, toApiMessages } from '@/lib/claude/care-qa'
import { explainSubsidy } from '@/lib/claude/subsidy-explainer'
import { toProfile } from '@/lib/auth'
import { estimateSubsidy, type SubsidyInput } from '@/lib/subsidy'

const input: SubsidyInput = {
  care: 'childcare',
  programme: 'full_day',
  monthlyFee: 670,
  isWorking: true,
  householdIncome: 6000,
  householdSize: 3,
  citizenship: 'citizen',
  startDate: '2026-12-01',
}

describe('explainSubsidy', () => {
  beforeEach(() => create.mockReset())

  it('returns our numbers, not whatever Claude says, and forces the tool call', async () => {
    create.mockResolvedValue({
      content: [{ type: 'tool_use', name: 'write_explanation', input: { explanation: 'You get $999 — lucky you.', tips: ['Check LifeSG — today'] } }],
    })
    const result = estimateSubsidy(input)
    const out = await explainSubsidy(input, result)

    expect(out.estimated_subsidy).toBe(612)
    expect(out.estimated_net_fee).toBe(58)
    expect(out.explanation).not.toContain('—')
    expect(out.explanation.endsWith(VERIFY_LINE)).toBe(true)
    expect(out.tips[0]).toBe('Check LifeSG, today')

    const call = create.mock.calls[0][0]
    expect(call.tool_choice).toEqual({ type: 'tool', name: 'write_explanation' })
    expect(call.messages[0].content).toContain('family pays $58 a month')
    expect(call.messages[0].content).toContain('minimum co-payment')
  })

  it('copes with an empty tool response', async () => {
    create.mockResolvedValue({ content: [] })
    const out = await explainSubsidy(input, estimateSubsidy(input))
    expect(out.explanation).toBe(VERIFY_LINE)
    expect(out.tips).toEqual([])
  })
})

describe('care Q&A', () => {
  it('starts history with the parent and keeps it bounded', () => {
    const history = [
      { role: 'assistant' as const, content: 'hello' },
      ...Array.from({ length: 30 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: String(i) })),
    ]
    const out = toApiMessages(history)
    expect(out[0].role).toBe('user')
    expect(out.length).toBeLessThanOrEqual(20)
  })

  it('puts the family in the prompt without the postal code', () => {
    const profile = toProfile('u', {
      child_name: 'Mei',
      child_birth_date: '2026-08-01',
      desired_start_date: '2027-01-04',
      household_income_monthly: 9000,
      citizenship_status: 'citizen',
      home_address: '271 Punggol Walk Singapore 820271',
    })
    const prompt = careSystemPrompt(profile)
    expect(prompt).toContain('Mei')
    expect(prompt).toContain('Infant care from Jan 2027')
    expect(prompt).toContain('$9,000')
    expect(prompt).not.toContain('820271')
  })

  it('keeps em dashes out of the shared facts', () => {
    expect(SG_CARE_FACTS).not.toMatch(/[—–]/)
  })
})
