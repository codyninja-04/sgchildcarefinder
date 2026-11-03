import { describe, expect, it } from 'vitest'
import { earliestInfantStart, levelFor, vacancyFor, vacancyIndex, vacancyMonths } from '@/lib/levels'
import type { Vacancy, VacancyMap } from '@/lib/types'

describe('levelFor', () => {
  it('puts babies between 2 and 18 months in infant care', () => {
    expect(levelFor('2026-06-15', '2026-09-01')).toMatchObject({ ok: true, level: 'infant' })
  })

  it('rejects babies under two months', () => {
    expect(levelFor('2026-10-01', '2026-11-15')).toMatchObject({ ok: false, reason: 'too_young' })
  })

  it('uses the calendar year for older children', () => {
    expect(levelFor('2024-11-20', '2027-01-04')).toMatchObject({ ok: true, level: 'n1' })
    expect(levelFor('2025-01-10', '2026-08-01')).toMatchObject({ ok: true, level: 'pg' })
    expect(levelFor('2022-02-01', '2027-01-04')).toMatchObject({ ok: true, level: 'k1' })
    expect(levelFor('2021-02-01', '2027-01-04')).toMatchObject({ ok: true, level: 'k2' })
  })

  it('flags school age children', () => {
    expect(levelFor('2020-02-01', '2027-01-04')).toMatchObject({ ok: false, reason: 'school_age' })
  })

  it('finds the earliest infant care start', () => {
    expect(earliestInfantStart('2026-12-20')).toBe('2027-02-20')
  })
})

describe('vacancy', () => {
  const months: Vacancy[] = ['available', 'limited', 'full', 'full', 'available', 'limited', 'full']
  const map: VacancyMap = { infant: months, k2: Array<Vacancy>(7).fill('na') }

  it('lines a start date up with ECDA slots', () => {
    expect(vacancyIndex('2026-11-02', '2026-11-20')).toBe(0)
    expect(vacancyIndex('2026-11-02', '2027-01-04')).toBe(2)
    expect(vacancyIndex('2026-11-02', '2027-05-01')).toBe(6)
    expect(vacancyIndex('2026-11-02', '2027-06-01')).toBeNull()
    expect(vacancyIndex('2026-11-02', '2026-09-01')).toBe(0)
  })

  it('reads the indicator for a level', () => {
    expect(vacancyFor(map, '2026-11-02', 'infant', '2027-01-04')).toBe('full')
    expect(vacancyFor(map, '2026-11-02', 'k2', '2027-01-04')).toBe('na')
    expect(vacancyFor(map, '2026-11-02', 'pg', '2027-01-04')).toBeNull()
    expect(vacancyFor(map, '2026-11-02', 'infant', '2028-01-04')).toBeNull()
  })

  it('labels months across a year end', () => {
    const labels = vacancyMonths('2026-11-02')
    expect(labels.map((m) => m.label)).toEqual(['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'])
    expect(labels[2].year).toBe(2027)
  })
})
