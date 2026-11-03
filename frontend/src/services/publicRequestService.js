// Mirrors: POST /api/v1/public/appointment-requests  (public, rate-limited)
// The mock writes to the in-memory database only. Nothing is saved after a refresh.
import { db } from '../data/store'
import { getNow } from '../utils/clock'
import {
    dayOfWeek,
    formatTime,
    getManilaDateStr,
    getManilaTimeStr,
    manilaIso,
    plusMinutes,
    toManilaIso,
} from '../utils/datetime'
import { overlaps } from '../utils/scheduling'
import { validateRequestForm } from '../utils/validators'
import { ApiError } from './ApiError'
import { getSubmissionFault } from './mockFaults'
import { mockApi } from './mockApi'

const DUPLICATE_WINDOW_MINUTES = 10

// Office hours, closed days, holidays and unavailable periods.
// Messages are generic: they must not reveal why the office is unavailable.
function checkOfficeRules(date, startIso, endIso, settings) {
    const rule = settings.workingHours.find((hours) => hours.daysOfWeek.includes(dayOfWeek(date)))
    if (!rule || !rule.start) {
        return { date: 'The office is closed on that day. Please choose a working day.' }
    }

    const startTime = getManilaTimeStr(startIso)
    const endTime = getManilaTimeStr(endIso)
    if (startTime < rule.start || endTime > rule.end || getManilaDateStr(endIso) !== date) {
        const opens = formatTime(manilaIso(date, rule.start))
        const closes = formatTime(manilaIso(date, rule.end))
        return { startTime: `Choose a time within office hours (${opens}–${closes}).` }
    }

    for (const period of settings.unavailable) {
        if (period.date !== date) continue
        if (!period.start) return { date: 'The office is unavailable on that day. Please choose another date.' }
        if (startTime < period.end && endTime > period.start) {
        return { startTime: 'The office is unavailable at that time. Please choose another time.' }
        }
    }
    return {}
}

function digitsOf(text) {
    return (text ?? '').replace(/\D/g, '')
}

// Same contact details and the same time, submitted a moment ago.
function findLikelyDuplicate(values, preferredStartAt, now) {
    const email = values.email.trim().toLowerCase()
    const phone = digitsOf(values.phone)
    return db.requests.find((request) => {
        const ageMinutes = (now.getTime() - new Date(request.createdAt).getTime()) / 60000
        if (request.status !== 'pending' || request.source !== 'online') return false
        if (request.preferredStartAt !== preferredStartAt) return false
        if (ageMinutes < 0 || ageMinutes > DUPLICATE_WINDOW_MINUTES) return false
        const sameEmail = email && request.requesterEmail?.toLowerCase() === email
        const samePhone = phone && digitsOf(request.requesterPhone) === phone
        return sameEmail || samePhone
    })
}

// values: { fullName, email, phone, purpose, date, startTime }
// Success returns what the confirmation page needs (never internal ids).
// Failures throw ApiError: 422 (details.fieldErrors), 409, 429, 500.
export function submitRequest(values) {
    return mockApi(() => {
        const fault = getSubmissionFault()
        if (fault === 'network_error') throw new TypeError('Failed to fetch')
        if (fault === 'rate_limited') throw new ApiError(429, 'rate_limited', 'Too many requests.')
        if (fault === 'server_error') throw new ApiError(500, 'server_error', 'Something went wrong.')

        const now = getNow()
        const settings = db.settings
        const fieldErrors = validateRequestForm(values, now)

        const startIso = manilaIso(values.date, values.startTime)
        const endIso = plusMinutes(startIso, settings.defaultDurationMinutes)
        if (!fieldErrors.date && !fieldErrors.startTime) {
        Object.assign(fieldErrors, checkOfficeRules(values.date, startIso, endIso, settings))
        }
        if (Object.keys(fieldErrors).length > 0) {
        throw new ApiError(422, 'validation_failed', 'Please correct the highlighted fields.', { fieldErrors })
        }

        if (findLikelyDuplicate(values, startIso, now)) {
        throw new ApiError(409, 'duplicate_submission', 'A request with these details was just received.')
        }

        // Save the request (the real backend creates the reference number securely).
        const nextNumber = Math.max(...db.requests.map((r) => Number(r.referenceNumber.slice(-4)))) + 1
        const number = String(nextNumber).padStart(4, '0')
        const nowIso = toManilaIso(now)
        const requesterEmail = values.email.trim() || null
        const request = {
        id: `req-${number}`,
        referenceNumber: `REQ-2026-${number}`,
        source: 'online',
        requesterName: values.fullName.trim(),
        requesterEmail,
        requesterPhone: values.phone.trim() || null,
        purpose: values.purpose.trim(),
        preferredStartAt: startIso,
        preferredEndAt: endIso,
        status: 'pending',
        encodedBy: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        }
        db.requests.push(request)
        db.statusHistory.push({
        id: `hist-${number}-1`,
        requestId: request.id,
        appointmentId: null,
        oldStatus: null,
        newStatus: 'pending',
        changedBy: null,
        reason: null,
        changedAt: nowIso,
        })
        if (requesterEmail) {
        db.notifications.push({
            id: `ntf-${number}-1`,
            requestId: request.id,
            appointmentId: null,
            recipientEmail: requesterEmail,
            templateKey: 'acknowledgement',
            status: 'queued',
            attemptCount: 0,
            lastError: null,
            nextAttemptAt: nowIso,
            createdAt: nowIso,
            sentAt: null,
        })
        }

        // Not a block: the time is only a request. We just tell the person it may be taken.
        const buffer = settings.bufferMinutes
        const timeMayBeUnavailable = db.appointments.some(
        (a) =>
            a.status === 'confirmed' &&
            overlaps(plusMinutes(startIso, -buffer), plusMinutes(endIso, buffer), a.startAt, a.endAt),
        )

        return {
        referenceNumber: request.referenceNumber,
        status: 'pending',
        preferredStartAt: startIso,
        preferredEndAt: endIso,
        requesterEmail,
        acknowledgement: requesterEmail ? 'queued' : 'none',
        timeMayBeUnavailable,
        }
    })
}
