import { describe, expect, it } from 'vitest'
import { getOfficeRuleViolation } from './officeRules'

const settings = {
    workingHours: [
        { daysOfWeek: [1, 2, 3, 4, 5], start: '08:00', end: '17:00' },
        { daysOfWeek: [0, 6], start: null, end: null },
    ],
    unavailable: [
        { date: '2026-12-25', label: 'Christmas Day', start: null, end: null },
        { date: '2026-10-30', label: 'Out of office', start: '13:00', end: '17:00' },
    ],
}
const slot = (date, start, end) => [`${date}T${start}:00+08:00`, `${date}T${end}:00+08:00`]
const check = (date, start, end) => getOfficeRuleViolation(...slot(date, start, end), settings)

describe('getOfficeRuleViolation', () => {
    it('allows a normal working-day slot, including one that ends exactly at closing', () => {
        expect(check('2026-10-27', '09:00', '10:00')).toBe(null)
        expect(check('2026-10-27', '16:00', '17:00')).toBe(null)
    })

    it('refuses weekends', () => {
        expect(check('2026-10-31', '10:00', '11:00').code).toBe('closed_day') // Saturday
        expect(check('2026-11-01', '10:00', '11:00').code).toBe('closed_day') // Sunday
    })

    it('refuses times outside office hours', () => {
        expect(check('2026-10-27', '07:30', '08:30').code).toBe('outside_hours')
        expect(check('2026-10-27', '16:30', '17:30').code).toBe('outside_hours')
    })

    it('refuses a whole-day holiday and a partial unavailable period', () => {
        expect(check('2026-12-25', '10:00', '11:00').code).toBe('unavailable_day')
        expect(check('2026-10-30', '14:00', '15:00').code).toBe('unavailable_period')
    })

    it('allows the time just before an unavailable period (the end is exclusive)', () => {
        expect(check('2026-10-30', '12:00', '13:00')).toBe(null)
    })
})
