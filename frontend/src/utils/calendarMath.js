// The maths behind the calendar: which dates a view covers, moving between them, where an event
// sits on the hour grid, and which time is non-working. Pure functions (no React), so they are
// easy to test. Dates are 'YYYY-MM-DD' in Asia/Manila, like everywhere else.
import {
    addDays,
    dayOfWeek,
    formatDate,
    formatDayHeading,
    formatMonthYear,
    formatShortDate,
    formatTime,
    getManilaDateStr,
    getManilaTimeStr,
    manilaIso,
} from './datetime'

export const VIEWS = ['day', 'week', 'month']
export const DEFAULT_VIEW = 'week'
export const HOUR_HEIGHT = 60 // pixels per hour on the grid
export const MIN_EVENT_HEIGHT = 24 // so a 15-minute event is still readable and clickable

const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

// True for a real calendar date such as '2026-10-26' (not '2026-02-30' or 'banana').
export function isValidDateString(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false
    const [year, month, day] = value.split('-').map(Number)
    const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
    return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth
}

export const startOfWeek = (date) => addDays(date, -((dayOfWeek(date) + 6) % 7)) // weeks start on Monday
export const startOfMonth = (date) => `${date.slice(0, 7)}-01`
export function endOfMonth(date) {
    const [year, month] = date.split('-').map(Number)
    return `${date.slice(0, 7)}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0')}`
}

// The first and last date the view shows. Month: just the month's own days.
export function getRange(view, date) {
    if (view === 'day') return { from: date, to: date }
    if (view === 'week') return { from: startOfWeek(date), to: addDays(startOfWeek(date), 6) }
    return { from: startOfMonth(date), to: endOfMonth(date) }
}

export function getDaysInRange(from, to) {
    const days = []
    for (let day = from; day <= to; day = addDays(day, 1)) days.push(day)
    return days
}

// direction: 1 (next) or -1 (previous). Month steps land on the 1st of that month.
export function shiftDate(view, date, direction) {
    if (view === 'day') return addDays(date, direction)
    if (view === 'week') return addDays(date, 7 * direction)
    return startOfMonth(addDays(direction > 0 ? endOfMonth(date) : startOfMonth(date), direction))
}

// Weeks of 7 cells for the month grid. Days of the neighbouring months are { inMonth: false }.
export function getMonthGrid(date) {
    const first = startOfMonth(date)
    const last = endOfMonth(date)
    const days = getDaysInRange(startOfWeek(first), addDays(startOfWeek(last), 6))
    const weeks = []
    for (let index = 0; index < days.length; index += 7) {
        weeks.push(days.slice(index, index + 7).map((day) => ({ date: day, inMonth: day >= first && day <= last })))
    }
    return weeks
}

// "Monday, Oct 26, 2026" | "Oct 26 – Nov 1, 2026" | "October 2026"
export function rangeLabel(view, date) {
    const noon = (day) => manilaIso(day, '12:00')
    if (view === 'day') return formatDayHeading(noon(date))
    if (view === 'month') return formatMonthYear(noon(date))
    const { from, to } = getRange('week', date)
    return from.slice(0, 4) === to.slice(0, 4)
        ? `${formatShortDate(noon(from))} – ${formatDate(noon(to))}`
        : `${formatDate(noon(from))} – ${formatDate(noon(to))}`
}

export const calendarHref = (view, date) => `/calendar?view=${view}&date=${date}`

// ---- events ----

// "Maria Santos" -> "Maria S."   "Juan Dela Cruz" -> "Juan C."   "Cher" -> "Cher"
export function shortName(fullName) {
    const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return ''
    if (parts.length === 1) return parts[0]
    return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

// Confirmed and completed appointments show their purpose; a pending request shows who asked.
export function eventTitle(event, { compact = false } = {}) {
    if (event.kind === 'request') {
        return compact ? shortName(event.requesterName) : `${shortName(event.requesterName)} (pending)`
    }
    return event.title
}

// "9:00 AM" -> "9 AM", "9:30 AM" stays (short, for month chips)
export const formatCompactTime = (iso) => formatTime(iso).replace(':00', '')

export function groupEventsByDate(events) {
    const groups = {}
    for (const event of events) {
        const date = getManilaDateStr(event.startAt)
        ;(groups[date] ??= []).push(event)
    }
    for (const list of Object.values(groups)) list.sort((a, b) => a.startAt.localeCompare(b.startAt))
    return groups
}

// What the Day summary card counts.
export function summarizeDay(events) {
    return {
        confirmed: events.filter((e) => e.kind === 'appointment' && e.status === 'confirmed').length,
        completed: events.filter((e) => e.kind === 'appointment' && e.status === 'completed').length,
        pending: events.filter((e) => e.kind === 'request').length,
    }
}

// ---- the hour grid (day and week views) ----

const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

// Minutes since midnight on `date`. An event that ends on a later day counts as ending at midnight.
export function minutesOfDay(iso, date) {
  return getManilaDateStr(iso) === date ? toMinutes(getManilaTimeStr(iso)) : 24 * 60
}

// { startHour, endHour }: the working hours (8–17), widened if an event or a day's hours fall outside.
export function getHourRange(workingHours, events) {
    const open = workingHours.filter((rule) => rule.start)
    let start = open.length ? Math.min(...open.map((rule) => Math.floor(toMinutes(rule.start) / 60))) : 8
    let end = open.length ? Math.max(...open.map((rule) => Math.ceil(toMinutes(rule.end) / 60))) : 17
    for (const event of events) {
        const date = getManilaDateStr(event.startAt)
        start = Math.min(start, Math.floor(minutesOfDay(event.startAt, date) / 60))
        end = Math.max(end, Math.ceil(minutesOfDay(event.endAt, date) / 60))
    }
    return { startHour: Math.max(0, start), endHour: Math.min(24, end) }
}

// Pixel position of an event inside its day column.
export function positionEvent(event, startHour) {
    const date = getManilaDateStr(event.startAt)
    const startMinutes = minutesOfDay(event.startAt, date)
    const endMinutes = minutesOfDay(event.endAt, date)
    return {
        top: ((startMinutes - startHour * 60) / 60) * HOUR_HEIGHT,
        height: Math.max(((endMinutes - startMinutes) / 60) * HOUR_HEIGHT, MIN_EVENT_HEIGHT),
    }
}

// Events of ONE day that overlap in time are placed side by side. A confirmed appointment never
// overlaps another (FR-18), but a pending request can overlap anything.
// Returns [{ event, column, columns }]: use column / columns for the left offset and width.
export function layoutOverlaps(dayEvents) {
    const sorted = [...dayEvents].sort(
        (a, b) => a.startAt.localeCompare(b.startAt) || a.endAt.localeCompare(b.endAt),
    )
    const result = []
    let cluster = []
    let clusterEnd = -1
    let columnEnds = []

    const flush = () => {
        for (const item of cluster) item.columns = columnEnds.length
        result.push(...cluster)
        cluster = []
        columnEnds = []
    }

    for (const event of sorted) {
        const date = getManilaDateStr(event.startAt)
        const start = minutesOfDay(event.startAt, date)
        const end = Math.max(minutesOfDay(event.endAt, date), start + 1)
        if (start >= clusterEnd) {
        flush()
        clusterEnd = -1
        }
        let column = columnEnds.findIndex((columnEnd) => columnEnd <= start)
        if (column === -1) column = columnEnds.length
        columnEnds[column] = end
        clusterEnd = Math.max(clusterEnd, end)
        cluster.push({ event, column, columns: 1 })
    }
    flush()
    return result
}

// ---- non-working time (the hatched parts) ----

const ruleFor = (date, workingHours) => workingHours.find((rule) => rule.daysOfWeek.includes(dayOfWeek(date)))

// Is the whole day closed? { closed, label }: label is the holiday name, or null for a normal day off.
export function getDayStatus(date, workingHours, unavailable) {
    const wholeDay = unavailable.find((period) => period.date === date && !period.start)
    if (wholeDay) return { closed: true, label: wholeDay.label }
    const rule = ruleFor(date, workingHours)
    return { closed: !rule || !rule.start, label: null }
}

// Hatched blocks for one day, in minutes since midnight, limited to the visible hours:
// the whole day when closed, otherwise before opening, after closing and any unavailable period.
export function getUnavailableBlocks(date, workingHours, unavailable, startHour, endHour) {
    const from = startHour * 60
    const to = endHour * 60
    const { closed, label } = getDayStatus(date, workingHours, unavailable)
    if (closed) return [{ start: from, end: to, label }]

    const rule = ruleFor(date, workingHours)
    const blocks = []
    if (toMinutes(rule.start) > from) blocks.push({ start: from, end: toMinutes(rule.start), label: null })
    if (toMinutes(rule.end) < to) blocks.push({ start: toMinutes(rule.end), end: to, label: null })
    for (const period of unavailable) {
        if (period.date === date && period.start) {
        blocks.push({
            start: Math.max(from, toMinutes(period.start)),
            end: Math.min(to, toMinutes(period.end)),
            label: period.label,
        })
        }
    }
    return blocks.filter((block) => block.end > block.start)
}

// "8 AM" for the first row, "12 PM" at noon, otherwise just the hour ("9", "1").
export function formatHourLabel(hour, isFirst) {
    const twelve = hour % 12 === 0 ? 12 : hour % 12
    if (isFirst || hour === 12) return `${twelve} ${hour < 12 ? 'AM' : 'PM'}`
    return String(twelve)
}