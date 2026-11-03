import { CLAUDE_MODEL, SG_CARE_FACTS, VERIFY_LINE, anthropic } from './client'
import { money } from '../format'
import type { SubsidyInput, SubsidyResult } from '../subsidy'

export interface SubsidyExplanation {
  estimated_subsidy: number
  estimated_net_fee: number
  explanation: string
  tips: string[]
}

const TOOL = {
  name: 'write_explanation',
  description: 'Return the plain English explanation of the subsidy estimate.',
  input_schema: {
    type: 'object' as const,
    properties: {
      explanation: {
        type: 'string',
        description: 'Two or three short paragraphs. Plain English, second person, no headings, no bullet points.',
      },
      tips: {
        type: 'array',
        items: { type: 'string' },
        maxItems: 3,
        description: 'Up to three short, specific things this family could check or do. Each one sentence.',
      },
    },
    required: ['explanation', 'tips'],
  },
}

/**
 * The numbers are already worked out in code (lib/subsidy.ts). Claude's job is to
 * explain them to a tired parent and point out anything worth checking. It is told
 * not to produce its own figures, and the figures we return are ours, not its.
 */
export async function explainSubsidy(input: SubsidyInput, result: SubsidyResult): Promise<SubsidyExplanation> {
  const facts = [
    `Care: ${input.care === 'infant' ? 'infant care (2 to 18 months)' : 'childcare (18 months to 6 years)'}, ${input.programme === 'full_day' ? 'full day' : 'half day'}`,
    `Monthly fee: ${money(result.fee)}`,
    `Child citizenship: ${input.citizenship}`,
    `Main applicant working 56+ hours a month: ${input.isWorking ? 'yes' : 'no'}`,
    `Gross monthly household income: ${input.householdIncome == null ? 'not given' : money(input.householdIncome)}`,
    `Household size: ${input.householdSize ?? 'not given'}`,
    `Start date: ${input.startDate ?? 'not given'} (uses the ${result.rateYear} rates)`,
    '',
    `Result from the calculator (treat as correct):`,
    `Basic Subsidy ${money(result.basic)}, Additional Subsidy ${money(result.additional)}${result.bandLabel ? ` (income band ${result.bandLabel})` : ''}`,
    `Total subsidy ${money(result.total)}, family pays ${money(result.net)} a month`,
    result.cappedByCopay ? `Additional Subsidy was held below its ${money(result.maxAdditional)} maximum by the ${money(result.minCopay)} minimum co-payment.` : '',
    result.usedPerCapita ? 'Assessed on per capita income.' : '',
    result.fullSubsidyRegardless ? 'Full childcare subsidy applies despite the mother not working, because of low household income.' : '',
    ...result.notes.map((n) => `Note: ${n}`),
  ]
    .filter(Boolean)
    .join('\n')

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 700,
    system: `You explain Singapore childcare subsidies in plain English to parents. Be warm but brief, and never preachy.

${SG_CARE_FACTS}

Rules:
- Use only the figures given to you. Do not calculate a different subsidy or invent amounts.
- Explain why they get what they get: which subsidy, which band, and what moves it (income, working status, the 2027 change).
- If WMCR or other tax relief is relevant, mention it is separate from the fee and does not lower it.
- No em dashes. Use commas or full stops.
- End the explanation with exactly: "${VERIFY_LINE}"`,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content: `${facts}\n\nExplain this estimate to me.` }],
  })

  const block = response.content.find((b) => b.type === 'tool_use')
  const out = (block && block.type === 'tool_use' ? block.input : {}) as { explanation?: string; tips?: string[] }
  let explanation = (out.explanation ?? '').replace(/\s*[—–]\s*/g, ', ').trim()
  if (!explanation.endsWith(VERIFY_LINE)) explanation = `${explanation}\n\n${VERIFY_LINE}`.trim()

  return {
    estimated_subsidy: result.total,
    estimated_net_fee: result.net,
    explanation,
    tips: (out.tips ?? []).slice(0, 3).map((t) => t.replace(/\s*[—–]\s*/g, ', ')),
  }
}
