// Mirrors: POST /api/v1/public/appointment-requests  (public, rate-limited)
// The mock writes to the in-memory database only. Nothing is saved after a refresh.
import { db } from '../data/store'
import { getNow } from '../utils/clock'
import {
    formatTime,
    manilaIso,
    plusMinutes,
    toManilaIso,
} from '../utils/datetime'
import { getOfficeRuleViolation } from '../utils/officeRules'
import { validateRequestForm } from '../utils/validators'
import { ApiError } from './ApiError'
import { getSubmissionFault } from './mockFaults'
import { mockApi } from './mockApi'
import { insertPendingRequest, timeMayBeUnavailable } from './requestRecords'

const DUPLICATE_WINDOW_MINUTES = 10

// Office hours, closed days, holidays and unavailable periods.
// The rules live in utils/officeRules.js (shared with approval). Messages here are generic:
// they must not reveal why the office is unavailable.
function checkOfficeRules(date, startIso, endIso, settings){
    const violation = getOfficeRuleViolation(startIso, endIso, settings)
    if(!violation) return {}

    switch(violation.code){
        case 'closed_day':
            return { date: 'The office is closed on that day. Please choose a workin day.'}
        case 'outside_hours': {
            const opens = formatTime(manilaIso(date, violation.rule.start))
            const closes = formatTime(manilaIso(date, violation.rule.end))
            return { startTime: `Choose a time within office hours (${opens}–${closes}).`}
        }
        case 'unavailable_day':
            return { date: 'The office is unavailable on that day. Please choose another date.' }
        default: //unavailable-period
            return { startTime: 'The office is unavailable at that time. Please choose another time.' }

    }
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

        const nowIso = toManilaIso(now)
        const { request, acknowledgement } = insertPendingRequest({
        source: 'online',
        values: {
            name: values.fullName.trim(),
            email: values.email.trim(),
            phone: values.phone.trim(),
            purpose: values.purpose.trim(),
        },
        startAt: startIso,
        endAt: endIso,
        at: nowIso,
        })
        return {
            referenceNumber: request.referenceNumber,
            status: 'pending',
            preferredStartAt: startIso,
            preferredEndAt: endIso,
            requesterEmail: request.requesterEmail,
            acknowledgement,
            timeMayBeUnavailable: timeMayBeUnavailable(startIso, endIso),
        }
    }, { public: true })
}
