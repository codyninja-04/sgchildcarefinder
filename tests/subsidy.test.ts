import { describe, expect, it } from 'vitest'
import { bandLabel, estimateSubsidy, rateYearFor, subsidyTable } from '@/lib/subsidy'

const base = {
  care: 'childcare' as const,
  programme: 'full_day' as const,
  isWorking: true,
  citizenship: 'citizen' as const,
  startDate: '2026-11-01',
}

describe('estimateSubsidy', () => {
  it('matches the worked example: $670 fee at $6,000 household income in 2026', () => {
    const r = estimateSubsidy({ ...base, monthlyFee: 670, householdIncome: 6000 })
    expect(r.basic).toBe(300)
    expect(r.maxAdditional).toBe(340)
    expect(r.minCopay).toBe(58)
    expect(r.additional).toBe(312)
    expect(r.net).toBe(58)
    expect(r.cappedByCopay).toBe(true)
  })

  it('gives the full $467 Additional Subsidy at the lowest band when the fee is high enough', () => {
    const r = estimateSubsidy({ ...base, monthlyFee: 1200, householdIncome: 2500 })
    expect(r.additional).toBe(467)
    expect(r.net).toBe(1200 - 300 - 467)
    expect(r.band).toBe(0)
  })

  it('stops Additional Subsidy above $12,000 in 2026', () => {
    const r = estimateSubsidy({ ...base, monthlyFee: 1200, householdIncome: 12001 })
    expect(r.additional).toBe(0)
    expect(r.basic).toBe(300)
    expect(r.band).toBeNull()
  })

  it('uses the wider 2027 bands for a January 2027 start', () => {
    const r = estimateSubsidy({ ...base, monthlyFee: 1200, householdIncome: 14000, startDate: '2027-01-05' })
    expect(r.rateYear).toBe(2027)
    expect(r.bandLabel).toBe('$13,001 to $15,000')
    expect(r.additional).toBe(80)
  })

  it('moves a $3,200 household into the lowest band in 2027', () => {
    const in2026 = estimateSubsidy({ ...base, monthlyFee: 1200, householdIncome: 3200 })
    const in2027 = estimateSubsidy({ ...base, monthlyFee: 1200, householdIncome: 3200, startDate: '2027-03-01' })
    expect(in2026.additional).toBe(440)
    expect(in2027.additional).toBe(467)
  })

  it('applies infant care rates', () => {
    const r = estimateSubsidy({ ...base, care: 'infant', monthlyFee: 1500, householdIncome: 5000 })
    expect(r.basic).toBe(600)
    expect(r.maxAdditional).toBe(500)
    expect(r.additional).toBe(500)
    expect(r.net).toBe(400)
  })

  it('gives non working applicants $150 and no Additional Subsidy for infant care', () => {
    const r = estimateSubsidy({ ...base, care: 'infant', isWorking: false, monthlyFee: 1500, householdIncome: 3000 })
    expect(r.basic).toBe(150)
    expect(r.additional).toBe(0)
    expect(r.fullSubsidyRegardless).toBe(false)
  })

  it('treats a low income non working childcare family as working', () => {
    const r = estimateSubsidy({ ...base, isWorking: false, monthlyFee: 800, householdIncome: 5000 })
    expect(r.fullSubsidyRegardless).toBe(true)
    expect(r.basic).toBe(300)
    expect(r.additional).toBe(340)
  })

  it('uses per capita income for households of five or more when it helps', () => {
    // $9,000 across 6 people is $1,500 PCI, band 2 in 2026. HHI alone is band 4.
    const r = estimateSubsidy({ ...base, monthlyFee: 1200, householdIncome: 9000, householdSize: 6 })
    expect(r.usedPerCapita).toBe(true)
    expect(r.band).toBe(2)
  })

  it('ignores per capita income for smaller households', () => {
    const r = estimateSubsidy({ ...base, monthlyFee: 1200, householdIncome: 9000, householdSize: 4 })
    expect(r.usedPerCapita).toBe(false)
    expect(r.band).toBe(4)
  })

  it('gives PR and foreign children no subsidy', () => {
    const r = estimateSubsidy({ ...base, citizenship: 'pr', monthlyFee: 1200, householdIncome: 3000 })
    expect(r.eligible).toBe(false)
    expect(r.net).toBe(1200)
  })

  it('never subsidises more than the fee', () => {
    const r = estimateSubsidy({ ...base, monthlyFee: 200, householdIncome: null })
    expect(r.basic).toBe(200)
    expect(r.net).toBe(0)
  })

  it('asks for income when it is missing', () => {
    const r = estimateSubsidy({ ...base, monthlyFee: 900, householdIncome: null })
    expect(r.additional).toBe(0)
    expect(r.notes.join(' ')).toMatch(/household income/)
  })
})

describe('tables', () => {
  it('picks the rate year from the start date', () => {
    expect(rateYearFor('2026-12-31')).toBe(2026)
    expect(rateYearFor('2027-01-01')).toBe(2027)
    expect(rateYearFor(null)).toBe(2026)
  })

  it('labels bands', () => {
    expect(bandLabel(2026, 0)).toBe('$3,000 and below')
    expect(bandLabel(2026, 1)).toBe('$3,001 to $4,500')
    expect(subsidyTable(2027, 'infant', 'full_day')).toHaveLength(7)
  })
})
