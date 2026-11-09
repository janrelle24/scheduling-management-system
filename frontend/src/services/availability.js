// The "can this time be booked?" logic that the SERVER owns. The mock services below call
// it; the real backend will do the same checks (and the database constraint will be the
// final safety net against double-booking). Not imported by any screen.
import { db } from '../data/store'
import { getNow } from '../utils/clock'
import {
    addDays,
    formatTimeRange,
    getManilaDateStr,
    manilaIso,
    plusMinutes,
} from '../utils/datetime'
import { getOfficeRuleViolation } from '../utils/officeRules'
import { overlaps } from '../utils/scheduling'

const SUGGESTION_STEP_MINUTES = 30
const SUGGESTION_SEARCH_DAYS = 14

// First confirmed appointment that overlaps the time, keeping the configured buffer free.
function findConflict(startAt, endAt, excludeAppointmentId) {
    const buffer = db.settings.bufferMinutes
    return db.appointments.find(
        (appointment) =>
        appointment.status === 'confirmed' &&
        appointment.id !== excludeAppointmentId &&
        overlaps(plusMinutes(startAt, -buffer), plusMinutes(endAt, buffer), appointment.startAt, appointment.endAt),
    )
}
// Staff-facing wording for an office-rule violation (the public form uses generic wording).
export function officeRuleMessage({ code, rule, period }, startAt) {
    const date = getManilaDateStr(startAt)
    switch (code) {
        case 'closed_day':
            return 'The office is closed on that day.'
        case 'outside_hours':
            return `Outside office hours (${formatTimeRange(manilaIso(date, rule.start), manilaIso(date, rule.end))}).`
        case 'unavailable_day':
            return `The office is marked unavailable that day (${period.label}).`
        default: // unavailable_period
            return `The office is marked unavailable then (${period.label}, ${formatTimeRange(
            manilaIso(period.date, period.start),
            manilaIso(period.date, period.end),
            )}).`
    }
}

// { available: true } or { available: false, reason, message, conflict? }
// Checks in this order: valid range, not in the past, office rules, other appointments.
// `conflict` shows only the times of the other appointment, never who it is with.
export function evaluateSlot({ startAt, endAt, excludeAppointmentId = null }) {
    if (!(new Date(endAt) > new Date(startAt))) {
        return { available: false, reason: 'invalid_range', message: 'The end time must be after the start time.' }
    }
    if (new Date(startAt) < getNow()) {
        return { available: false, reason: 'past', message: 'That time has already passed.' }
    }

    const violation = getOfficeRuleViolation(startAt, endAt, db.settings)
    if (violation) {
        return { available: false, reason: violation.code, message: officeRuleMessage(violation, startAt) }
    }

    const conflict = findConflict(startAt, endAt, excludeAppointmentId)
    if (conflict) {
        return {
        available: false,
        reason: 'conflict',
        message: `Overlaps a confirmed appointment (${formatTimeRange(conflict.startAt, conflict.endAt)}).`,
        conflict: { startAt: conflict.startAt, endAt: conflict.endAt },
        }
    }
    return { available: true }
}

// Up to `count` free slots of the same length, at or after the requested start.
// Tries every 30 minutes; a suggestion never overlaps the one before it, so you get
// 10:00, 11:00, 12:00 rather than 10:00, 10:30, 11:00. Continues onto later days.
export function findNextAvailable({ startAt, endAt, excludeAppointmentId = null }, count = 3) {
    const length = (new Date(endAt) - new Date(startAt)) / 60000
    const firstDate = getManilaDateStr(startAt)
    const suggestions = []
    let minNextStart = new Date(startAt)

    for (let dayOffset = 0; dayOffset <= SUGGESTION_SEARCH_DAYS; dayOffset += 1) {
        const date = addDays(firstDate, dayOffset)
        for (let minutes = 0; minutes < 24 * 60; minutes += SUGGESTION_STEP_MINUTES) {
            const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
            const candidateStart = manilaIso(date, time)
            if (new Date(candidateStart) < minNextStart) continue
            const candidateEnd = plusMinutes(candidateStart, length)
            if (evaluateSlot({ startAt: candidateStart, endAt: candidateEnd, excludeAppointmentId }).available) {
                suggestions.push({ startAt: candidateStart, endAt: candidateEnd })
                if (suggestions.length === count) return suggestions
                minNextStart = new Date(candidateEnd)
            }
        }
    }
    return suggestions
}
