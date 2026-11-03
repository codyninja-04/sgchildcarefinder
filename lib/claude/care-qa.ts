import { CLAUDE_MODEL, SG_CARE_FACTS, anthropic } from './client'
import { LEVEL_META } from '../levels'
import { ageLabel, money, monthYear, searchContext } from '../format'
import type { Profile, QaMessage } from '../types'

export const QA_HISTORY_LIMIT = 20

function familyContext(profile: Profile): string {
  const lines: string[] = []
  if (profile.child_birth_date) {
    const ctx = searchContext(profile)
    lines.push(`Child: ${profile.child_name ?? 'unnamed'}, ${ageLabel(profile.child_birth_date)} now, would join ${LEVEL_META[ctx.level].label} from ${monthYear(ctx.startDate)}.`)
  }
  if (profile.citizenship_status) lines.push(`Child citizenship: ${profile.citizenship_status}.`)
  if (profile.household_income_monthly != null) lines.push(`Gross household income: ${money(profile.household_income_monthly)} a month.`)
  if (profile.household_size) lines.push(`Household size: ${profile.household_size}.`)
  lines.push(`Mother working: ${profile.is_working_mother ? 'yes' : 'no'}.`)
  if (profile.home_address) lines.push(`Lives near: ${profile.home_address.replace(/\d{6}$/, '').trim()}.`)
  return lines.join('\n')
}

export function careSystemPrompt(profile: Profile) {
  return `You help Singapore parents think through childcare: infant care centres, childcare, nannies, grandparents and helpers, subsidies, waitlists and the practical side of going back to work.

${SG_CARE_FACTS}

About this family (they gave us this, use it when relevant, don't recite it back):
${familyContext(profile)}

How to answer:
- Be practical and specific to Singapore. Short paragraphs, plain words. Use a short list only when comparing options.
- Lay out trade offs honestly. There is no single right answer between a centre, a nanny and grandparents, and the parent knows their family best. Don't moralise or push one choice.
- Stick to the figures above. If something isn't covered (a specific centre's fees, the latest scheme tweak, their exact tax), say so and point them to ECDA, LifeSG, IRAS or the centre.
- This app doesn't register children with centres and doesn't see live vacancies. ECDA's vacancy indicator is a monthly guide reported by centres.
- For anything about a child's health or development, suggest their paediatrician or polyclinic.
- No em dashes. Use commas or full stops.`
}

export function toApiMessages(history: Pick<QaMessage, 'role' | 'content'>[]) {
  // Keep it bounded and make sure it starts with the parent speaking.
  const recent = history.slice(-QA_HISTORY_LIMIT)
  while (recent.length && recent[0].role !== 'user') recent.shift()
  return recent.map((m) => ({ role: m.role, content: m.content }))
}

export function streamCareAnswer(profile: Profile, history: Pick<QaMessage, 'role' | 'content'>[]) {
  return anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 1200,
    system: careSystemPrompt(profile),
    messages: toApiMessages(history),
  })
}
