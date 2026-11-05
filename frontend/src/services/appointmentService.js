// Mirrors: GET /api/v1/appointments, GET /api/v1/appointments/:id, GET /api/v1/calendar
import { db } from '../data/store'
import { getManilaDateStr } from '../utils/datetime'
import { ApiError } from './ApiError'
import { inDateRange, mockApi, paginate } from './mockApi'

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
