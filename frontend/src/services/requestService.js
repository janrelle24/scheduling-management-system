// Mirrors: GET /api/v1/appointment-requests and GET /api/v1/appointment-requests/:id
import { db } from '../data/store'
import { getDisplayStatus } from '../utils/status'
import { getManilaDateStr, manilaIso } from '../utils/datetime'
import { getNow } from '../utils/clock'
import { getOfficeRuleViolation } from '../utils/officeRules'
import { validateStaffRequestForm } from '../utils/validators'
import { PERMISSIONS } from '../utils/permissions'
import { ApiError } from './ApiError'
import { evaluateSlot, officeRuleMessage } from './availability'
import { nowIso, normalizeReason, queueDecisionEmail, recordChange } from './decisions'
import { countByDisplayStatus, findAppointmentForRequest, getUserName } from './lookups'
import { inDateRange, mockApi, paginate } from './mockApi'
import { getSubmissionFault } from './mockFaults'
import { requireActor } from './mockSession'
import { insertPendingRequest, timeMayBeUnavailable } from './requestRecords'

function toListItem(request) {
    const appointment = findAppointmentForRequest(request.id)
    return {
        ...request,
        appointment,
        displayStatus: getDisplayStatus(request, appointment),
        encodedByName: getUserName(request.encodedBy),
    }
}

// filters: { search, status, source, dateFrom, dateTo } (status = display status)
// dates are 'YYYY-MM-DD' and filter on the preferred date. Newest requests first.
export function listRequests({
    search = '',
    status = '',
    source = '',
    dateFrom = '',
    dateTo = '',
    page = 1,
    pageSize = 10,
    } = {}) {
    return mockApi(() => {
        const term = search.trim().toLowerCase()
        const rows = db.requests
        .map(toListItem)
        .filter((item) => !status || item.displayStatus === status)
        .filter((item) => !source || item.source === source)
        .filter((item) => inDateRange(getManilaDateStr(item.preferredStartAt), dateFrom, dateTo))
        .filter(
            (item) =>
            !term ||
            item.referenceNumber.toLowerCase().includes(term) ||
            item.requesterName.toLowerCase().includes(term) ||
            item.purpose.toLowerCase().includes(term),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
        return paginate(rows, page, pageSize)
    })
}

// One request with its appointment, status history, emails and audit activity.
export function getRequest(id) {
    return mockApi(() => {
        const request = db.requests.find((row) => row.id === id)
        if (!request) throw new ApiError(404, 'not_found', 'Request not found.')
        const byTime = (key) => (a, b) => a[key].localeCompare(b[key])
        const appointmentId = findAppointmentForRequest(id)?.id
        return {
        ...toListItem(request),
        statusHistory: db.statusHistory
            .filter((row) => row.requestId === id)
            .sort(byTime('changedAt'))
            .map((row) => ({ ...row, changedByName: getUserName(row.changedBy) })),
        notifications: db.notifications.filter((row) => row.requestId === id).sort(byTime('createdAt')),
        activity: db.auditLogs
            .filter((row) => row.entityId === id || (appointmentId && row.entityId === appointmentId))
            .sort(byTime('createdAt'))
            .map((row) => ({ ...row, actorName: getUserName(row.userId) })),
        }
    })
}

export function getStatusCounts() {
    return mockApi(() => ({
        total: db.requests.length,
        statusCounts: countByDisplayStatus(db.requests),
    }))
}


// Mirrors: POST /api/v1/appointment-requests/:id/approve   (appointments.approve)
// body: { startAt, endAt }  -> creates the appointment and confirms the request.
// Errors: 401, 403 (no permission), 404, 409 not_pending (already handled), and
// slot_unavailable (409 for a conflict, 422 for office rules / past / bad range).
// In the real backend ALL of the writes below happen in ONE database transaction, and an
// exclusion constraint stops two overlapping bookings even if two staff approve at once.
// Here the handler runs without interruption, which stands in for that.
// Returns { appointmentId, startAt, endAt, notification: 'queued' | 'failed' | 'none' }.
export function approveRequest(id, { startAt, endAt }) {
    return mockApi(() => {
        const actor = requireActor(PERMISSIONS.APPOINTMENTS_APPROVE)
        const request = db.requests.find((row) => row.id === id)
        if (!request) throw new ApiError(404, 'not_found', 'Request not found.')
        if (request.status !== 'pending') {
            throw new ApiError(409, 'not_pending', 'This request was already handled.', {
            currentStatus: request.status,
            })
        }
    
        const verdict = evaluateSlot({ startAt, endAt })
        if (!verdict.available) {
            throw new ApiError(
                verdict.reason === 'conflict' ? 409 : 422,
                'slot_unavailable',
                verdict.message,
                { reason: verdict.reason, conflict: verdict.conflict ?? null },
            )
        }
    
        const at = nowIso()
        const appointmentId = `apt-${request.id.slice(4)}` // 'req-0142' -> 'apt-0142'
    
        db.appointments.push({
            id: appointmentId,
            requestId: request.id,
            startAt,
            endAt,
            status: 'confirmed',
            confirmedBy: actor.id,
            createdAt: at,
            updatedAt: at,
        })
        request.status = 'confirmed'
        request.updatedAt = at
        recordChange({
            request,
            appointmentId,
            oldStatus: 'pending',
            newStatus: 'confirmed',
            actor,
            at,
            audit: { action: 'request.approved', entityType: 'appointment_request', entityId: request.id },
        })
        const notification = queueDecisionEmail({ request, appointmentId, templateKey: 'approval', at })
        return { appointmentId, startAt, endAt, notification }
    })
}

// Mirrors: POST /api/v1/appointment-requests/:id/reject   (appointments.reject)
// body: { reason }  -> the request becomes rejected; it never reserved a time (UC-04).
// Errors: 401, 403, 404, 409 not_pending, 422 validation_failed (reason required / too long).
// Returns { notification: 'queued' | 'failed' | 'none' }.

export function rejectRequest(id, { reason } = {}) {
    return mockApi(() => {
        const actor = requireActor(PERMISSIONS.APPOINTMENTS_REJECT)
        const request = db.requests.find((row) => row.id === id)
        if (!request) throw new ApiError(404, 'not_found', 'Request not found.')
        if (request.status !== 'pending') {
            throw new ApiError(409, 'not_pending', 'This request was already handled.', {
                currentStatus: request.status,
            })
        }
        const cleanReason = normalizeReason(reason)
    
        const at = nowIso()
        request.status = 'rejected'
        request.updatedAt = at
        recordChange({
            request,
            oldStatus: 'pending',
            newStatus: 'rejected',
            actor,
            reason: cleanReason,
            at,
            audit: {
            action: 'request.rejected',
            entityType: 'appointment_request',
            entityId: request.id,
            details: { reason: cleanReason },
            },
        })
        return { notification: queueDecisionEmail({ request, templateKey: 'rejection', at }) }
    })
}

// ---- New in-person request ----
const MAX_DUPLICATES_SHOWN = 3
const digitsOf = (text) => (text ?? '').replace(/\D/g, '')
const normalizeName = (name) => (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase()

// Likely duplicates: a pending or confirmed request for the same person on the same preferred
// date. "Same person" = same email, same phone digits, or same name (ignoring case and extra
// spaces). Only a warning for staff (UC-02), so it can afford to be broader than the public
// form's rule. Newest first.
function findDuplicateCandidates({ fullName, email, phone, date }) {
    const name = normalizeName(fullName)
    const mail = (email ?? '').trim().toLowerCase()
    const digits = digitsOf(phone)
    if (name.length < 2 || !date) return []
    return db.requests
        .filter((request) => request.status === 'pending' || request.status === 'confirmed')
        .filter((request) => getManilaDateStr(request.preferredStartAt) === date)
        .filter(
            (request) =>
            normalizeName(request.requesterName) === name ||
            (mail && request.requesterEmail?.toLowerCase() === mail) ||
            (digits.length >= 7 && digitsOf(request.requesterPhone) === digits),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// Only what the warning shows: no contact details, no notes.
const toDuplicateSummary = (request) => ({
    id: request.id,
    referenceNumber: request.referenceNumber,
    requesterName: request.requesterName,
    preferredStartAt: request.preferredStartAt,
    status: request.status,
})

function summarizeDuplicates(candidates) {
    return { items: candidates.slice(0, MAX_DUPLICATES_SHOWN).map(toDuplicateSummary), total: candidates.length }
}

// PROPOSED endpoint (not in Phase 2): POST /api/v1/appointment-requests/duplicate-check
// body: { fullName, email, phone, date } -> { items: [...up to 3], total }. A preview for the
// New In-Person Request form (requests.create). Creating the request checks again.
export function findPossibleDuplicates(values) {
    return mockApi(() => {
        requireActor(PERMISSIONS.REQUESTS_CREATE)
        return summarizeDuplicates(findDuplicateCandidates(values))
    })
}

// Mirrors: POST /api/v1/appointment-requests   (requests.view + requests.create)
// values: { fullName, email, phone, purpose, date, startTime, endTime, internalNotes }
// options: { acknowledgeDuplicate } staff have seen the duplicate warning and want to save anyway
// Same validation and office rules as the online form (UC-02): staff cannot bypass them.
// Errors: 401, 403, 422 validation_failed (details.fieldErrors), 409 possible_duplicate
// (details.duplicates), 500. A pending request reserves no time, so overlapping a confirmed
// appointment is allowed; the result says so (timeMayBeUnavailable).
// Returns { id, referenceNumber, acknowledgement: 'queued' | 'none', emailOnFile, timeMayBeUnavailable }.
export function createRequest(values, { acknowledgeDuplicate = false } = {}) {
    return mockApi(() => {
        const fault = getSubmissionFault() // the DEV "submission failure" setting also applies here
        if (fault === 'network_error') throw new TypeError('Failed to fetch')
        if (fault === 'server_error') throw new ApiError(500, 'server_error', 'Something went wrong.')
    
        const actor = requireActor(PERMISSIONS.REQUESTS_CREATE)
        requireActor(PERMISSIONS.REQUESTS_VIEW)
    
        const now = getNow()
        const fieldErrors = validateStaffRequestForm(values, now)
        const startAt = manilaIso(values.date, values.startTime)
        const endAt = manilaIso(values.date, values.endTime)
        if (!fieldErrors.date && !fieldErrors.startTime && !fieldErrors.endTime) {
            const violation = getOfficeRuleViolation(startAt, endAt, db.settings)
            if (violation) {
            const field = ['closed_day', 'unavailable_day'].includes(violation.code) ? 'date' : 'startTime'
            fieldErrors[field] = officeRuleMessage(violation, startAt)
            }
        }
        if (Object.keys(fieldErrors).length > 0) {
            throw new ApiError(422, 'validation_failed', 'Please correct the highlighted fields.', { fieldErrors })
        }
    
        const duplicates = findDuplicateCandidates(values)
        if (duplicates.length > 0 && !acknowledgeDuplicate) {
            throw new ApiError(409, 'possible_duplicate', 'This may duplicate an existing request.', {
            duplicates: summarizeDuplicates(duplicates),
            })
        }
    
        const at = nowIso()
        const { request, acknowledgement } = insertPendingRequest({
            source: 'in_person',
            values: {
            name: values.fullName.trim(),
            email: values.email.trim(),
            phone: values.phone.trim(),
            purpose: values.purpose.trim(),
            internalNotes: (values.internalNotes ?? '').trim(),
            },
            startAt,
            endAt,
            actor,
            at,
        })
        db.auditLogs.push({
            id: `aud-new-${db.auditLogs.length + 1}`,
            userId: actor.id,
            action: 'request.created',
            entityType: 'appointment_request',
            entityId: request.id,
            details: { referenceNumber: request.referenceNumber, source: 'in_person' },
            ipAddress: null,
            createdAt: at,
        })
    
        return {
            id: request.id,
            referenceNumber: request.referenceNumber,
            acknowledgement,
            emailOnFile: Boolean(request.requesterEmail),
            timeMayBeUnavailable: timeMayBeUnavailable(startAt, endAt),
        }
    })
}