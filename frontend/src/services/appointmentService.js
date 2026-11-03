// Mirrors: GET /api/v1/appointments, GET /api/v1/appointments/:id, GET /api/v1/calendar
import { db } from '../data/store'
import { getManilaDateStr } from '../utils/datetime'
import { ApiError } from './ApiError'
import { inDateRange, mockApi } from './mockApi'

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

// params: { from, to, status } with dates as 'YYYY-MM-DD'. Earliest first.
export function listAppointments({ from = '', to = '', status = '' } = {}) {
    return mockApi(() =>
        db.appointments
        .filter((row) => !status || row.status === status)
        .filter((row) => inDateRange(getManilaDateStr(row.startAt), from, to))
        .map(toAppointmentItem)
        .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    )
}

export function getAppointment(id) {
    return mockApi(() => {
        const appointment = db.appointments.find((row) => row.id === id)
        if (!appointment) throw new ApiError(404, 'not_found', 'Appointment not found.')
        return toAppointmentItem(appointment)
    })
}

// Everything the calendar draws for a date range:
//  - "appointment" events: confirmed/completed. Confirmed ones BLOCK the time.
//  - "request" events: pending requests at their preferred time. They do NOT block time.
//  - unavailable periods and working hours (to draw hatched/closed time)
// Cancelled appointments and rejected requests are not shown.
export function getCalendar({ from, to }) {
    return mockApi(() => {
        const appointmentEvents = db.appointments
        .filter((row) => row.status !== 'cancelled')
        .filter((row) => inDateRange(getManilaDateStr(row.startAt), from, to))
        .map((row) => {
            const item = toAppointmentItem(row)
            return {
            id: row.id,
            kind: 'appointment',
            status: row.status,
            title: item.purpose,
            requesterName: item.requesterName,
            referenceNumber: item.referenceNumber,
            requestId: row.requestId,
            startAt: row.startAt,
            endAt: row.endAt,
            }
        })

        const requestEvents = db.requests
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
