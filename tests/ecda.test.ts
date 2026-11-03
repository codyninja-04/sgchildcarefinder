import { describe, expect, it } from 'vitest'
import { dedupeFees, headlineFees, parseCentre, parseFee, parseLanguages, tidyAddress, tidyName } from '@/lib/ecda'
import row from './fixtures/ecda-centre.json'

describe('parseCentre', () => {
  // A real record from ECDA's Listing of Centres, pulled on 3 Nov 2026.
  const centre = parseCentre(row)!

  it('keeps the identifiers', () => {
    expect(centre.centre_code).toBe('PT0860')
    expect(centre.name).toBe('Adventure Tree Preschool Bukit Timah')
    expect(centre.postal_code).toBe('596360')
  })

  it('tidies the address', () => {
    expect(centre.address).toBe('59 Yuk Tong Avenue, Singapore 596360')
  })

  it('reads vacancy for every level and month', () => {
    expect(centre.vacancy.infant).toEqual(Array(7).fill('na'))
    expect(centre.vacancy.n1?.slice(0, 3)).toEqual(['limited', 'limited', 'available'])
    expect(centre.vacancy.pg).toHaveLength(7)
  })

  it('reads the practical details', () => {
    expect(centre.operator).toBe('independent')
    expect(centre.scheme_type).toBeNull()
    expect(centre.centre_type).toBe('childcare')
    expect(centre.operating_hours).toBe('07:00-19:00')
    expect(centre.saturday_hours).toBe('07:00-14:00')
    expect(centre.languages).toEqual(['Chinese', 'German'])
    expect(centre.provides_transport).toBe(true)
    expect(centre.website).toBe('https://www.adventuretree.com.sg')
    expect(centre.ecda_updated_on).toBe('2026-11-02')
  })

  it('recognises anchor operators and shortens their names', () => {
    const anchor = parseCentre({
      ...row,
      centre_name: 'PCF SPARKLETOTS @ TAMPINES BLK 123 (DS)',
      organisation_description: 'PCF Sparkletots Preschool Limited',
      scheme_type: 'Anchor Operator Scheme',
    })!
    expect(anchor.scheme_type).toBe('anchor')
    expect(anchor.is_anchor_operator).toBe(true)
    expect(anchor.operator).toBe('PCF Sparkletots')
    expect(anchor.name).toBe('PCF Sparkletots @ Tampines Blk 123 (DS)')
    expect(parseCentre({ ...row, centre_name: 'STAR LEARNERS @ RIVERVALE PTE LTD' })!.name).toBe('Star Learners @ Rivervale')
    expect(parseCentre({ ...row, centre_name: 'MINDCHAMPS PRESCHOOL@BOON KENG PTE. LTD.' })!.name).toBe('Mindchamps Preschool @ Boon Keng')
  })

  it('skips rows without a code', () => {
    expect(parseCentre({ ...row, centre_code: 'na' })).toBeNull()
  })
})

describe('fees', () => {
  const raw = [
    { centre_code: 'EB0001', type_of_service: 'Full Day', levels_offered: 'Kindergarten 1 (5 yrs old)', fees: '610', type_of_citizenship: 'SC' },
    { centre_code: 'EB0001', type_of_service: 'Full Day', levels_offered: 'Kindergarten 1 (5 yrs old)', fees: '1125', type_of_citizenship: 'Others' },
    { centre_code: 'EB0001', type_of_service: 'Full Day', levels_offered: 'Infant (2 to 18 mths)', fees: '1240', type_of_citizenship: 'SC' },
    { centre_code: 'EB0001', type_of_service: 'Half Day', levels_offered: 'Nursery (4 yrs old)', fees: '420', type_of_citizenship: 'SC' },
    { centre_code: 'EB0001', type_of_service: 'Full Day', levels_offered: 'Pre-Nursery (3 yrs old)', fees: '600', type_of_citizenship: 'SPR' },
    { centre_code: 'EB0001', type_of_service: 'Full Day', levels_offered: 'Playgroup (18 mths to 2 yrs old)', fees: 'na', type_of_citizenship: 'SC' },
  ]
  const fees = raw.map(parseFee).filter((f): f is NonNullable<typeof f> => f !== null)

  it('maps ECDA level names to our codes', () => {
    expect(fees.map((f) => f.level)).toEqual(['k1', 'k1', 'infant', 'n2', 'n1'])
    expect(fees.map((f) => f.citizenship)).toEqual(['citizen', 'other', 'citizen', 'citizen', 'pr'])
  })

  it('drops rows without a usable fee', () => {
    expect(fees).toHaveLength(5)
  })

  it('keeps the higher of duplicate fees', () => {
    const dup = dedupeFees([...fees, { ...fees[0], monthly_fee: 650 }])
    expect(dup.filter((f) => f.level === 'k1' && f.citizenship === 'citizen')[0].monthly_fee).toBe(650)
  })

  it('pulls the Singapore Citizen headline fees', () => {
    expect(headlineFees(fees)).toEqual({
      monthly_fee_full_day: 610,
      monthly_fee_half_day: 420,
      monthly_fee_infant_full_day: 1240,
    })
  })
})

describe('text helpers', () => {
  it('splits languages', () => {
    expect(parseLanguages('Chinese|Malay|Others: French')).toEqual(['Chinese', 'Malay', 'French'])
    expect(parseLanguages('na')).toEqual([])
  })

  it('handles unit numbers in addresses', () => {
    expect(tidyAddress('1,TAMPINES CENTRAL 5,#02-01,529508', '529508')).toBe('1 Tampines Central 5 #02-01, Singapore 529508')
  })

  it('leaves mixed case names alone', () => {
    expect(tidyName('Little Footprints Preschool')).toBe('Little Footprints Preschool')
  })
})
