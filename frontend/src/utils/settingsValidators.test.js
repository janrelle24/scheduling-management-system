import { describe, expect, it } from 'vitest'
import { normalizeSettings, toWholeNumber, validateSettings, validateUnavailableEntry } from './settingsValidators'

const today = '2026-10-26'
const base = () => ({
    workingHours: [
        { label: 'Mon–Fri', daysOfWeek: [1, 2, 3, 4, 5], start: '08:00', end: '17:00' },
        { label: 'Sat–Sun', daysOfWeek: [0, 6], start: null, end: null },
    ],
    defaultDurationMinutes: '60',
    bufferMinutes: '0',
    requireReasonOnRejectCancel: true,
    emailOnDecision: true,
    sendAcknowledgement: true,
    retentionMonths: '24',
    unavailable: [
        { id: 'unv-001', label: 'Christmas Day', date: '2026-12-25', start: null, end: null },
        { id: 'unv-002', label: 'Out of office', date: '2026-10-30', start: '13:00', end: '17:00' },
    ],
})
const errorsFor = (change) => {
    const draft = base()
    change(draft)
    return validateSettings(draft, { today, knownIds: new Set(['unv-001', 'unv-002']) })
}

describe('toWholeNumber', () => {
    it('accepts whole numbers only', () => {
        expect(toWholeNumber('45')).toBe(45)
        expect(toWholeNumber(45)).toBe(45)
        expect(toWholeNumber(' 7 ')).toBe(7)
        for (const bad of ['', '4.5', '-3', 'abc', 4.5, null, undefined]) expect(Number.isNaN(toWholeNumber(bad))).toBe(true)
    })
})

describe('validateSettings', () => {
    it('accepts the current settings', () => {
        expect(errorsFor(() => {})).toEqual({})
    })

    it('checks the numbers against their (proposed) limits', () => {
        expect(errorsFor((d) => { d.defaultDurationMinutes = '0' }).defaultDurationMinutes).toBe('Enter a whole number of minutes from 15 to 480.')
        expect(errorsFor((d) => { d.defaultDurationMinutes = '481' }).defaultDurationMinutes).toBeDefined()
        expect(errorsFor((d) => { d.defaultDurationMinutes = '15' }).defaultDurationMinutes).toBe(undefined)
        expect(errorsFor((d) => { d.bufferMinutes = '-5' }).bufferMinutes).toBe('Enter a whole number of minutes from 0 to 240.')
        expect(errorsFor((d) => { d.bufferMinutes = '241' }).bufferMinutes).toBeDefined()
        expect(errorsFor((d) => { d.retentionMonths = '0' }).retentionMonths).toBe('Enter a whole number of months from 1 to 120.')
        expect(errorsFor((d) => { d.retentionMonths = '121' }).retentionMonths).toBeDefined()
        expect(errorsFor((d) => { d.retentionMonths = '1.5' }).retentionMonths).toBeDefined()
    })

    it('checks working hours: both times, in order, in 15-minute steps', () => {
        expect(errorsFor((d) => { d.workingHours[0].end = '07:00' })['workingHours.0.end']).toBe('The end time must be after the start time.')
        expect(errorsFor((d) => { d.workingHours[0].end = null })['workingHours.0.end']).toBe('Enter both times, or mark the day as closed.')
        expect(errorsFor((d) => { d.workingHours[1].start = '09:00' })['workingHours.1.end']).toBe('Enter both times, or mark the day as closed.')
        expect(errorsFor((d) => { d.workingHours[0].start = '08:10' })['workingHours.0.start']).toBe('Use 15-minute steps.')
        expect(errorsFor((d) => { d.workingHours[1].start = '09:00'; d.workingHours[1].end = '12:00' })).toEqual({})
    })

    it('needs the office to be open at least one day', () => {
        const errors = errorsFor((d) => { d.workingHours[0].start = null; d.workingHours[0].end = null })
        expect(errors.workingHours).toBe('The office must be open at least one day a week.')
    })

    it('checks every unavailable period', () => {
        const errors = errorsFor((d) => { d.unavailable[0].label = '  '; d.unavailable[1].end = '12:00' })
        expect(errors['unavailable.0.label']).toBe('Enter a label.')
        expect(errors['unavailable.1.end']).toBe('The end time must be after the start time.')
    })

    it('lets an EXISTING period be in the past but refuses a NEW one', () => {
        const past = (id) => (d) => { d.unavailable.push({ id, label: 'Old', date: '2026-01-01', start: null, end: null }) }
        expect(errorsFor(past('unv-002'))['unavailable.2.date']).toBe(undefined) // an id already known
        expect(errorsFor(past('new-1'))['unavailable.2.date']).toBe('Choose a date that is not in the past.')
    })
})

describe('validateUnavailableEntry (the Add dialog)', () => {
    const ok = { label: 'All Souls’ Day', date: '2026-11-02', start: '', end: '' }
    it('accepts a whole day and a partial period', () => {
        expect(validateUnavailableEntry(ok, { today })).toEqual({})
        expect(validateUnavailableEntry({ ...ok, start: '14:00', end: '15:00' }, { today })).toEqual({})
    })
    it('needs a label and a valid date that is not in the past', () => {
        expect(validateUnavailableEntry({ ...ok, label: '', date: '' }, { today })).toEqual({ label: 'Enter a label.', date: 'Choose a date.' })
        expect(validateUnavailableEntry({ ...ok, date: '2026-10-25' }, { today }).date).toBe('Choose a date that is not in the past.')
        expect(validateUnavailableEntry({ ...ok, date: '2026-02-30' }, { today }).date).toBe('Enter a valid date.')
        expect(validateUnavailableEntry({ ...ok, label: 'x'.repeat(101) }, { today }).label).toBe('Use 100 characters or fewer.')
    })
    it('needs both times or neither', () => {
        expect(validateUnavailableEntry({ ...ok, start: '14:00' }, { today }).end).toBe('Enter both times, or leave both empty for the whole day.')
    })
})

describe('normalizeSettings', () => {
    it('stores numbers as numbers, trims labels, nulls empty times and sorts periods', () => {
        const draft = base()
        draft.defaultDurationMinutes = ' 45 '
        draft.unavailable = [
        { id: 'b', label: ' Later ', date: '2026-12-01', start: '', end: '' },
        { id: 'a', label: 'Sooner', date: '2026-11-01', start: '13:00', end: '14:00' },
        ]
        const result = normalizeSettings(draft)
        expect(result.defaultDurationMinutes).toBe(45)
        expect(result.unavailable.map((u) => u.id)).toEqual(['a', 'b'])
        expect(result.unavailable[1]).toEqual({ id: 'b', label: 'Later', date: '2026-12-01', start: null, end: null })
    })
})
