// Mirrors: GET /api/v1/appointment-requests and GET /api/v1/appointment-requests/:id
import { db } from '../data/store'
import { getDisplayStatus } from '../utils/status'
import { getManilaDateStr } from '../utils/datetime'
//import { getNow } from '../utils/clock'
//import { getManilaDateStr, plusMinutes, toManilaIso } from '../utils/datetime'
import { PERMISSIONS } from '../utils/permissions'
import { ApiError } from './ApiError'
import { evaluateSlot } from './availability'
import { nowIso, normalizeReason, queueDecisionEmail, recordChange } from './decisions'
import { countByDisplayStatus, findAppointmentForRequest, getUserName } from './lookups'
import { inDateRange, mockApi, paginate } from './mockApi'
//import { getEmailFault } from './mockFaults'
import { requireActor } from './mockSession'

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