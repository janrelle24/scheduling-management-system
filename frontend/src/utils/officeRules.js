import { dayOfWeek, getManilaDateStr, getManilaTimeStr } from './datetime'

// The office's own rules for WHEN an appointment may happen: working days and hours,
// closed days, holidays and unavailable periods. Pure: it only needs the settings.
// Used by the public form AND by approval, so every way of booking follows the same rules.
//
// Returns null if the time is allowed, or { code, ... }:
//   closed_day          the office does not work on that weekday
//   outside_hours       starts before opening or ends after closing (or ends another day)
//   unavailable_day     a holiday or whole-day unavailable period   (period)
//   unavailable_period  overlaps an unavailable period of that day  (period)
export function getOfficeRuleViolation(startIso, endIso, settings) {
    const date = getManilaDateStr(startIso)
    const rule = settings.workingHours.find((hours) => hours.daysOfWeek.includes(dayOfWeek(date)))
    if (!rule || !rule.start) return { code: 'closed_day' }

    const startTime = getManilaTimeStr(startIso)
    const endTime = getManilaTimeStr(endIso)
    if (startTime < rule.start || endTime > rule.end || getManilaDateStr(endIso) !== date) {
        return { code: 'outside_hours', rule }
    }

    for (const period of settings.unavailable) {
        if (period.date !== date) continue
        if (!period.start) return { code: 'unavailable_day', period }
        if (startTime < period.end && endTime > period.start) return { code: 'unavailable_period', period }
    }
    return null
}
