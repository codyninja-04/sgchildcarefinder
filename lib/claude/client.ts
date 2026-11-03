import Anthropic from '@anthropic-ai/sdk'

// One shared client for the subsidy explainer and the care Q&A.
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? 'missing' })

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5'

export function claudeConfigured() {
  return !!process.env.ANTHROPIC_API_KEY
}

/**
 * The facts both prompts lean on. Kept in one place so the explainer and the Q&A
 * never disagree. Figures are from ECDA's subsidy tables (updated Oct 2026) and
 * IRAS. Claude is told to send people to the source for anything not listed.
 */
export const SG_CARE_FACTS = `Singapore infant care and childcare facts (as of late 2026):

Subsidies (ECDA, Singapore Citizen children at ECDA licensed centres only, PR and foreign children get none):
- Basic Subsidy, full day: infant care $600 a month, childcare $300 a month, when the main applicant (the mother, or a single father) works at least 56 hours a month. Non working applicants get $150.
- Additional Subsidy is income tested and only for working applicants. Full day maximums: infant care up to $710, childcare up to $467 at the lowest band, tapering as income rises. Each band also has a minimum co-payment, so the family always pays something.
- Income ceiling for Additional Subsidy: gross monthly household income $12,000 (or per capita income $3,000 for households of 5 or more) during 2026. From 1 Jan 2027 the ceiling rises to $15,000 (per capita $3,400) and every band widens.
- Families with a child in childcare (not infant care) and household income of $6,000 or less (per capita $1,500) get full childcare subsidies even if the mother is not working. From 1 Jan 2027 that threshold is $7,500 (per capita $1,700).
- Students, job seekers and caregivers can ask ECDA for Special Approval of higher subsidies.
- Anchor Operators (PCF Sparkletots, My First Skool, M.Y World, E-Bridge, Skool4Kidz) and Partner Operators run under government fee caps, so their fees are usually much lower than private centres.
- Apply for subsidies through LifeSG once you have a place. The centre confirms enrolment.

Tax and other support (IRAS and MSF, separate from childcare subsidy, do not conflate them):
- Working Mother's Child Relief (WMCR) is an income tax relief, not a subsidy. For Singapore Citizen children born or adopted on or after 1 Jan 2024 it is a fixed amount: $8,000 for the first child, $10,000 for the second, $12,000 for the third and later. For older children it is 15%, 20% and 25% of the mother's earned income. It does not reduce the childcare fee.
- Grandparent Caregiver Relief is $3,000 of tax relief for a working mother whose Singapore Citizen child aged 12 or below is looked after by a grandparent who is not working.
- Child Development Account (Baby Bonus) money can pay fees at ECDA licensed centres.
- Households with a Singapore Citizen child under 16 pay the concessionary $60 monthly levy for a migrant domestic worker instead of the full levy.

Care options:
- Infant care centres take babies from 2 to 18 months. ECDA licenses them and sets staff ratios. Waitlists for popular centres and for anchor operators can run many months.
- Nannies and babysitters are not licensed by ECDA and there is no government subsidy for them. Rates vary widely, often paid in cash.
- Grandparent care costs little in cash but depends on the grandparent's health and stamina, and can strain relationships. It qualifies for Grandparent Caregiver Relief.
- A migrant domestic worker (helper) at home can care for a baby but is not a trained early childhood educator.`

export const VERIFY_LINE = "Verify exact eligibility and amounts at ECDA's Child Care Subsidy calculator or Parents Gateway."
