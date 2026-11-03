// Mirrors: GET /api/v1/appointment-requests and GET /api/v1/appointment-requests/:id
import { db } from '../data/store'
import { getDisplayStatus } from '../utils/status'
import { getManilaDateStr } from '../utils/datetime'
import { ApiError } from './ApiError'
import { findAppointmentForRequest, getUserName } from './lookups'
import { inDateRange, mockApi, paginate } from './mockApi'

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
