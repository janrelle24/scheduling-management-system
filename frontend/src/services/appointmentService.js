// Mirrors: GET /api/v1/appointments, GET /api/v1/appointments/:id, GET /api/v1/calendar
import { db } from '../data/store'
import { getManilaDateStr } from '../utils/datetime'
import { getNow } from '../utils/clock'
import { hasPermission, PERMISSIONS } from '../utils/permissions'
import { ApiError } from './ApiError'
import { evaluateSlot, findNextAvailable } from './availability'
import { nowIso, normalizeReason, queueDecisionEmail, recordChange } from './decisions'
import { inDateRange, mockApi, paginate } from './mockApi'
import { requireActor } from './mockSession'

function toAppointmentItem(appointment) {
    const request = db.requests.find((row) => row.id === appointment.requestId)
    return {
        ...appointment,
        referenceNumber: request.referenceNumber,
        requesterName: request.requesterName,
        purpose: request.purpose,
        source: request.source,
    }
}


export function listAppointments({
    search = '',
    status = '',
    source = '',
    dateFrom = '',
    dateTo = '',
    page = 1,
    pageSize = 10,
    order = 'desc',
} = {}) {
    return mockApi(() => {
        const term = search.trim().toLowerCase()
        const direction = order === 'asc' ? 1 : -1
        const rows = db.appointments
            .map(toAppointmentItem)
            .filter((row) => !status || row.status === status)
            .filter((row) => !source || row.source === source)
            .filter((row) => inDateRange(getManilaDateStr(row.startAt), dateFrom, dateTo))
            .filter(
            (row) =>
                !term ||
                row.referenceNumber.toLowerCase().includes(term) ||
                row.requesterName.toLowerCase().includes(term) ||
                row.purpose.toLowerCase().includes(term),
            )
            .sort((a, b) => direction * a.startAt.localeCompare(b.startAt))
        return paginate(rows, page, pageSize)
    })
}

export function getAppointment(id) {
    return mockApi(() => {
        const appointment = db.appointments.find((row) => row.id === id)
        if (!appointment) throw new ApiError(404, 'not_found', 'Appointment not found.')
        return toAppointmentItem(appointment)
    })
}


export function getCalendar({ from, to }) {
    return mockApi(() => {
        const actor = requireActor([PERMISSIONS.APPOINTMENTS_VIEW, PERMISSIONS.REQUESTS_VIEW])
        const appointmentEvents = !hasPermission(actor, PERMISSIONS.APPOINTMENTS_VIEW)
        ? []
        : db.appointments
            .filter((row) => row.status === 'confirmed' || row.status === 'completed')
            .filter((row) => inDateRange(getManilaDateStr(row.startAt), from, to))
            .map((row) => {
                const item = toAppointmentItem(row)
                return {
                    id: row.id,
                    kind: 'appointment',
                    status: row.status,
                    title: item.purpose,
                    referenceNumber: item.referenceNumber,
                    requestId: row.requestId,
                    startAt: row.startAt,
                    endAt: row.endAt,
                }
            })

        const requestEvents = !hasPermission(actor, PERMISSIONS.REQUESTS_VIEW)
            ? []
            : db.requests
                .filter((row) => row.status === 'pending')
                .filter((row) => inDateRange(getManilaDateStr(row.preferredStartAt), from, to))
                .map((row) => ({
                    id: row.id,
                    kind: 'request',
                    status: 'pending',
                    title: row.purpose,
                    requesterName: row.requesterName,
                    referenceNumber: row.referenceNumber,
                    requestId: row.id,
                    startAt: row.preferredStartAt,
                    endAt: row.preferredEndAt,
                }))

        return {
        from,
        to,
        events: [...appointmentEvents, ...requestEvents].sort((a, b) => a.startAt.localeCompare(b.startAt)),
        workingHours: db.settings.workingHours,
        unavailable: db.settings.unavailable.filter((row) => inDateRange(row.date, from, to)),
        }
    })
}

// PROPOSED endpoint (not in Phase 2): GET /api/v1/appointments/availability?startAt=&endAt=
// Lets an approver preview a time before confirming. It exists because the scheduling
// settings need settings.manage, so the browser cannot check office hours itself.
// Returns { available, reason?, message?, conflict?, suggestions } (suggestions only when
// not available). Needs appointments.approve or appointments.reschedule. The real
// approve/reschedule endpoints repeat the check; this preview never books anything.
export function checkAvailability({ startAt, endAt, excludeAppointmentId = null }) {
    return mockApi(() => {
        requireActor([PERMISSIONS.APPOINTMENTS_APPROVE, PERMISSIONS.APPOINTMENTS_RESCHEDULE])
        const verdict = evaluateSlot({ startAt, endAt, excludeAppointmentId })
        const suggestions = verdict.available
            ? []
            : findNextAvailable({ startAt, endAt, excludeAppointmentId })
        return { ...verdict, suggestions }
    })
}

// Shared by cancel and reschedule: only a confirmed appointment that has not ended can change.
function getChangeableAppointment(id) {
    const appointment = db.appointments.find((row) => row.id === id)
    if (!appointment) throw new ApiError(404, 'not_found', 'Appointment not found.')
    if (appointment.status !== 'confirmed') {
        throw new ApiError(409, 'not_active', 'This appointment was already handled.', {
            currentStatus: appointment.status,
        })
    }
    if (new Date(appointment.endAt) <= getNow()) {
        throw new ApiError(409, 'already_ended', 'This appointment has already ended.')
    }
    return appointment
}

// Mirrors: POST /api/v1/appointments/:id/cancel   (appointments.cancel)
// body: { reason }. The time is released at once: only confirmed appointments block time (BR-006).
// Errors: 401, 403, 404, 409 not_active / already_ended, 422 validation_failed.
// Returns { notification: 'queued' | 'failed' | 'none' }.
export function cancelAppointment(id, { reason } = {}) {
    return mockApi(() => {
        const actor = requireActor(PERMISSIONS.APPOINTMENTS_CANCEL)
        const appointment = getChangeableAppointment(id)
        const cleanReason = normalizeReason(reason)
        const request = db.requests.find((row) => row.id === appointment.requestId)
    
        const at = nowIso()
        appointment.status = 'cancelled'
        appointment.updatedAt = at
        request.status = 'cancelled'
        request.updatedAt = at
        recordChange({
            request,
            appointmentId: appointment.id,
            oldStatus: 'confirmed',
            newStatus: 'cancelled',
            actor,
            reason: cleanReason,
            at,
            audit: {
                action: 'appointment.cancelled',
                entityType: 'appointment',
                entityId: appointment.id,
                details: { reason: cleanReason },
            },
        })
        return {
            notification: queueDecisionEmail({ request, appointmentId: appointment.id, templateKey: 'cancellation', at }),
        }
    })
}

// Mirrors: POST /api/v1/appointments/:id/reschedule   (appointments.reschedule)
// body: { startAt, endAt }. The appointment keeps its identity and stays Confirmed (UC-05).
// The check ignores the appointment's own current slot. The old time is only given up in the
// same step that secures the new one, so it can never be left with neither (the real backend
// does this in one transaction).
// Errors: 401, 403, 404, 409 not_active / already_ended, 409 or 422 slot_unavailable,
// 422 no_change. Returns { startAt, endAt, notification }.
export function rescheduleAppointment(id, { startAt, endAt }) {
    return mockApi(() => {
        const actor = requireActor(PERMISSIONS.APPOINTMENTS_RESCHEDULE)
        const appointment = getChangeableAppointment(id)
    
        if (
            new Date(startAt).getTime() === new Date(appointment.startAt).getTime() &&
            new Date(endAt).getTime() === new Date(appointment.endAt).getTime()
        ) {
            throw new ApiError(422, 'no_change', 'That is already the current time.')
        }
        const verdict = evaluateSlot({ startAt, endAt, excludeAppointmentId: appointment.id })
        if (!verdict.available) {
            throw new ApiError(
            verdict.reason === 'conflict' ? 409 : 422,
            'slot_unavailable',
            verdict.message,
            { reason: verdict.reason, conflict: verdict.conflict ?? null },
            )
        }

        const request = db.requests.find((row) => row.id === appointment.requestId)
        const fromStartAt = appointment.startAt
        const at = nowIso()
        appointment.startAt = startAt
        appointment.endAt = endAt
        appointment.updatedAt = at
        request.updatedAt = at
        recordChange({
            request,
            appointmentId: appointment.id,
            oldStatus: 'confirmed',
            newStatus: 'confirmed',
            actor,
            reason: 'Rescheduled to a new time',
            at,
            audit: {
                action: 'appointment.rescheduled',
                entityType: 'appointment',
                entityId: appointment.id,
                details: { fromStartAt, toStartAt: startAt },
            },
        })
        return {
            startAt,
            endAt,
            notification: queueDecisionEmail({ request, appointmentId: appointment.id, templateKey: 'reschedule', at }),
        }
    })
}