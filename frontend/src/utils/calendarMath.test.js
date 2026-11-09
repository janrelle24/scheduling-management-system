import { describe, expect, it } from 'vitest'
import {
    endOfMonth, eventTitle, formatCompactTime, formatHourLabel, getDayStatus, getHourRange, getMonthGrid,
    getRange, getUnavailableBlocks, groupEventsByDate, isValidDateString, layoutOverlaps, positionEvent,
    rangeLabel, shiftDate, shortName, startOfWeek, summarizeDay,
} from './calendarMath'

const at = (date, time) => `${date}T${time}:00+08:00`
const event = (id, date, start, end, extra = {}) => ({ id, kind: 'appointment', status: 'confirmed', title: id, startAt: at(date, start), endAt: at(date, end), ...extra })
const workingHours = [
    { daysOfWeek: [1, 2, 3, 4, 5], start: '08:00', end: '17:00' },
    { daysOfWeek: [0, 6], start: null, end: null },
]
const unavailable = [
    { date: '2026-12-25', label: 'Christmas Day', start: null, end: null },
    { date: '2026-10-30', label: 'Out of office', start: '13:00', end: '17:00' },
]

describe('dates and ranges', () => {
    it('validates real dates only', () => {
        expect(isValidDateString('2026-10-26')).toBe(true)
        expect(isValidDateString('2028-02-29')).toBe(true) // leap year
        expect(isValidDateString('2026-02-29')).toBe(false)
        expect(isValidDateString('2026-13-01')).toBe(false)
        expect(isValidDateString('banana')).toBe(false)
        expect(isValidDateString(null)).toBe(false)
    })

    it('starts weeks on Monday', () => {
        expect(startOfWeek('2026-10-26')).toBe('2026-10-26') // Monday
        expect(startOfWeek('2026-10-28')).toBe('2026-10-26') // Wednesday
        expect(startOfWeek('2026-11-01')).toBe('2026-10-26') // Sunday
    })

    it('gives the range of each view', () => {
        expect(getRange('day', '2026-10-28')).toEqual({ from: '2026-10-28', to: '2026-10-28' })
        expect(getRange('week', '2026-10-28')).toEqual({ from: '2026-10-26', to: '2026-11-01' })
        expect(getRange('month', '2026-10-28')).toEqual({ from: '2026-10-01', to: '2026-10-31' })
        expect(endOfMonth('2028-02-10')).toBe('2028-02-29')
    })

    it('moves between days, weeks and months, across month and year boundaries', () => {
        expect(shiftDate('day', '2026-10-31', 1)).toBe('2026-11-01')
        expect(shiftDate('week', '2026-10-26', -1)).toBe('2026-10-19')
        expect(shiftDate('week', '2026-12-28', 1)).toBe('2027-01-04')
        expect(shiftDate('month', '2026-10-26', 1)).toBe('2026-11-01')
        expect(shiftDate('month', '2026-01-15', -1)).toBe('2025-12-01')
        expect(shiftDate('month', '2026-12-31', 1)).toBe('2027-01-01')
        expect(shiftDate('month', '2026-03-31', -1)).toBe('2026-02-01')
    })

    it('labels each view', () => {
        expect(rangeLabel('day', '2026-10-26')).toBe('Monday, Oct 26, 2026')
        expect(rangeLabel('week', '2026-10-28')).toBe('Oct 26 – Nov 1, 2026')
        expect(rangeLabel('week', '2026-12-30')).toBe('Dec 28, 2026 – Jan 3, 2027')
        expect(rangeLabel('month', '2026-10-26')).toBe('October 2026')
    })
})

describe('month grid', () => {
    it('has whole weeks, with blank days outside the month (October 2026: 3 before, 1 after)', () => {
        const weeks = getMonthGrid('2026-10-15')
        expect(weeks.length).toBe(5)
        expect(weeks.every((week) => week.length === 7)).toBe(true)
        expect(weeks[0].filter((day) => !day.inMonth).length).toBe(3) // Mon-Wed
        expect(weeks[0][3]).toEqual({ date: '2026-10-01', inMonth: true }) // Thursday
        expect(weeks[4].filter((day) => !day.inMonth).length).toBe(1) // Sunday Nov 1
    })

    it('handles a month that fills exactly four weeks (February 2027)', () => {
        const weeks = getMonthGrid('2027-02-10')
        expect(weeks.length).toBe(4)
        expect(weeks.flat().every((day) => day.inMonth)).toBe(true)
    })
    })

    describe('events', () => {
    it('shortens names and titles events', () => {
        expect(shortName('Maria Santos')).toBe('Maria S.')
        expect(shortName('Juan Dela Cruz')).toBe('Juan C.')
        expect(shortName('Cher')).toBe('Cher')
        expect(shortName('')).toBe('')
        expect(eventTitle({ kind: 'request', requesterName: 'Maria Santos' })).toBe('Maria S. (pending)')
        expect(eventTitle({ kind: 'request', requesterName: 'Maria Santos' }, { compact: true })).toBe('Maria S.')
        expect(eventTitle({ kind: 'appointment', title: 'Rotary Club' })).toBe('Rotary Club')
        expect(formatCompactTime(at('2026-10-26', '09:00'))).toBe('9 AM')
        expect(formatCompactTime(at('2026-10-26', '09:30'))).toBe('9:30 AM')
    })

    it('groups by Manila date, earliest first, and summarizes a day', () => {
        const events = [
        event('b', '2026-10-26', '11:00', '11:30'),
        event('a', '2026-10-26', '09:00', '10:00'),
        event('c', '2026-10-27', '09:00', '10:00', { status: 'completed' }),
        { id: 'p', kind: 'request', status: 'pending', startAt: at('2026-10-26', '15:30'), endAt: at('2026-10-26', '16:30') },
        ]
        const groups = groupEventsByDate(events)
        expect(groups['2026-10-26'].map((e) => e.id)).toEqual(['a', 'b', 'p'])
        expect(summarizeDay(groups['2026-10-26'])).toEqual({ confirmed: 2, completed: 0, pending: 1 })
        expect(summarizeDay(groups['2026-10-27'])).toEqual({ confirmed: 0, completed: 1, pending: 0 })
    })
})

describe('hour grid', () => {
    it('uses the working hours, and widens for an event outside them', () => {
        expect(getHourRange(workingHours, [])).toEqual({ startHour: 8, endHour: 17 })
        expect(getHourRange(workingHours, [event('early', '2026-10-27', '07:30', '08:30')])).toEqual({ startHour: 7, endHour: 17 })
        expect(getHourRange(workingHours, [event('late', '2026-10-27', '16:30', '18:15')])).toEqual({ startHour: 8, endHour: 19 })
        expect(getHourRange([{ daysOfWeek: [0, 1, 2, 3, 4, 5, 6], start: null, end: null }], [])).toEqual({ startHour: 8, endHour: 17 })
    })

    it('positions an event by start time and length, with a minimum height', () => {
        expect(positionEvent(event('x', '2026-10-26', '09:00', '10:00'), 8)).toEqual({ top: 60, height: 60 })
        expect(positionEvent(event('x', '2026-10-26', '14:30', '16:00'), 8)).toEqual({ top: 390, height: 90 })
        expect(positionEvent(event('x', '2026-10-26', '11:00', '11:10'), 8).height).toBe(24)
    })

    it('places overlapping events side by side and leaves others full width', () => {
        const laid = layoutOverlaps([
        event('confirmed', '2026-10-26', '09:00', '10:00'),
        event('pending', '2026-10-26', '09:30', '10:30'),
        event('later', '2026-10-26', '13:00', '14:00'),
        ])
        const byId = Object.fromEntries(laid.map((item) => [item.event.id, item]))
        expect(byId.confirmed).toMatchObject({ column: 0, columns: 2 })
        expect(byId.pending).toMatchObject({ column: 1, columns: 2 })
        expect(byId.later).toMatchObject({ column: 0, columns: 1 })
    })

    it('reuses a free column and does not treat back-to-back events as overlapping', () => {
        const laid = layoutOverlaps([
        event('a', '2026-10-26', '09:00', '10:00'),
        event('b', '2026-10-26', '10:00', '11:00'),
        event('c', '2026-10-26', '09:30', '10:30'),
        event('d', '2026-10-26', '10:15', '10:45'),
        ])
        const byId = Object.fromEntries(laid.map((item) => [item.event.id, item]))
        expect(byId.a.columns).toBe(3) // a, c and b/d form one cluster
        expect(byId.c.column).toBe(1)
        expect(byId.b.column).toBe(0) // a has ended, so column 0 is free again
        expect(layoutOverlaps([event('a', '2026-10-26', '09:00', '10:00'), event('b', '2026-10-26', '10:00', '11:00')]).every((item) => item.columns === 1)).toBe(true)
    })
})

describe('non-working time', () => {
    it('hatches closed days and holidays', () => {
        expect(getDayStatus('2026-10-31', workingHours, unavailable)).toEqual({ closed: true, label: null }) // Saturday
        expect(getDayStatus('2026-12-25', workingHours, unavailable)).toEqual({ closed: true, label: 'Christmas Day' })
        expect(getDayStatus('2026-10-27', workingHours, unavailable)).toEqual({ closed: false, label: null })
        expect(getDayStatus('2026-10-30', workingHours, unavailable).closed).toBe(false) // only part of the day
    })

    it('gives the hatched blocks of a day', () => {
        expect(getUnavailableBlocks('2026-10-31', workingHours, unavailable, 8, 17)).toEqual([{ start: 480, end: 1020, label: null }])
        expect(getUnavailableBlocks('2026-10-27', workingHours, unavailable, 8, 17)).toEqual([])
        expect(getUnavailableBlocks('2026-10-30', workingHours, unavailable, 8, 17)).toEqual([{ start: 780, end: 1020, label: 'Out of office' }])
        // the grid was widened to 7-19, so the hours outside opening are hatched too
        expect(getUnavailableBlocks('2026-10-27', workingHours, unavailable, 7, 19)).toEqual([
        { start: 420, end: 480, label: null },
        { start: 1020, end: 1140, label: null },
        ])
    })

    it('labels the hour rows like the design', () => {
        expect(formatHourLabel(8, true)).toBe('8 AM')
        expect(formatHourLabel(9, false)).toBe('9')
        expect(formatHourLabel(12, false)).toBe('12 PM')
        expect(formatHourLabel(13, false)).toBe('1')
    })
})
