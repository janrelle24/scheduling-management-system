import { describe, expect, it } from 'vitest'
import { REPORT_LIMIT_DAYS, validateReportRange } from './reportValidators'

describe('validateReportRange', () => {
    it('accepts a normal range, a single day, and exactly the limit', () => {
        expect(validateReportRange({ from: '2026-10-01', to: '2026-10-26' })).toEqual({})
        expect(validateReportRange({ from: '2026-10-26', to: '2026-10-26' })).toEqual({})
        expect(validateReportRange({ from: '2026-01-01', to: '2026-12-31' })).toEqual({}) // 365 days
        expect(REPORT_LIMIT_DAYS).toBe(366)
        expect(validateReportRange({ from: '2028-01-01', to: '2028-12-31' })).toEqual({}) // a leap year: 366 days
    })

    it('asks for missing or invalid dates', () => {
        expect(validateReportRange({ from: '', to: '' })).toEqual({ from: 'Choose a start date.', to: 'Choose an end date.' })
        expect(validateReportRange({ from: '2026-02-30', to: '2026-10-26' }).from).toBe('Enter a valid date.')
        expect(validateReportRange({ from: '2026-10-01', to: 'banana' }).to).toBe('Enter a valid date.')
    })

    it('refuses a start after the end, and a range over the limit', () => {
        expect(validateReportRange({ from: '2026-10-27', to: '2026-10-26' }).to).toBe('The end date must be on or after the start date.')
        expect(validateReportRange({ from: '2026-01-01', to: '2027-01-01' })).toEqual({}) // 366 days counting both ends: allowed
        expect(validateReportRange({ from: '2026-01-01', to: '2027-01-02' }).to).toBe('Choose a range of at most 366 days.') // 367: refused
        expect(validateReportRange({ from: '2025-01-01', to: '2026-12-31' }).to).toBe('Choose a range of at most 366 days.')
    })
})
