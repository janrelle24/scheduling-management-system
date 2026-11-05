// Date and time helpers. Everything is shown in the Asia/Manila timezone,
// no matter which timezone the visitor's browser is set to.
// Timestamps are ISO strings with an offset, e.g. '2026-10-27T09:30:00+08:00'
// (the same instant a PostgreSQL TIMESTAMPTZ column holds).
export const TIMEZONE = 'Asia/Manila'
const LOCALE = 'en-US'
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000 // Manila is UTC+8 all year (no daylight saving)

// Newer browsers put a narrow no-break space before AM/PM. Use a normal space.
function format(iso, options) {
    const text = new Intl.DateTimeFormat(LOCALE, { timeZone: TIMEZONE, ...options }).format(
        new Date(iso),
    )
    return text.replace(/\u202f/g, ' ')
}

export const formatDate = (iso) => format(iso, { month: 'short', day: 'numeric', year: 'numeric' }) // Oct 27, 2026
export const formatWeekdayDate = (iso) =>
    format(iso, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) // Tue, Oct 27, 2026
export const formatShortDate = (iso) => format(iso, { month: 'short', day: 'numeric' }) // Oct 27
export const formatLongDate = (iso) =>
  format(iso, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) // Monday, October 26, 2026
export const formatTime = (iso) => format(iso, { hour: 'numeric', minute: '2-digit', hour12: true }) // 9:30 AM
export const formatDateTime = (iso) => `${formatShortDate(iso)}, ${formatTime(iso)}` // Oct 27, 9:30 AM

// "9:00–10:00 AM" when both are AM or both PM, otherwise "11:00 AM–12:00 PM"
export function formatTimeRange(startIso, endIso) {
    const start = formatTime(startIso)
    const end = formatTime(endIso)
    return start.slice(-2) === end.slice(-2) ? `${start.slice(0, -3)}–${end}` : `${start}–${end}`
}

// "just now", "5m ago", "2h ago", "3d ago"
export function formatAge(iso, now) {
    const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
}

function manilaParts(iso, options) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: TIMEZONE,
        hourCycle: 'h23',
        ...options,
    }).formatToParts(new Date(iso))
    return (type) => parts.find((part) => part.type === type).value
}

// '2026-10-26' (the calendar date in Manila)
export function getManilaDateStr(iso) {
    const get = manilaParts(iso, { year: 'numeric', month: '2-digit', day: '2-digit' })
    return `${get('year')}-${get('month')}-${get('day')}`
}

// '09:30' (24-hour clock time in Manila)
export function getManilaTimeStr(iso) {
    const get = manilaParts(iso, { hour: '2-digit', minute: '2-digit' })
    return `${get('hour')}:${get('minute')}`
}

// Builds an ISO timestamp from a Manila date and time: ('2026-10-27', '09:30')
export function manilaIso(dateStr, timeStr) {
    return `${dateStr}T${timeStr}:00+08:00`
}

// Adds minutes to an ISO timestamp and returns it with the +08:00 offset.
export function plusMinutes(iso, minutes) {
    const ms = new Date(iso).getTime() + minutes * 60000
    return new Date(ms + MANILA_OFFSET_MS).toISOString().slice(0, 19) + '+08:00'
}

// A Date as an ISO string with the +08:00 offset, like the rest of the data.
export function toManilaIso(date) {
    return plusMinutes(date.toISOString(), 0)
}

// Date-only helpers on 'YYYY-MM-DD' strings.
export function addDays(dateStr, days) {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

// 0 = Sunday ... 6 = Saturday
export function dayOfWeek(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}
