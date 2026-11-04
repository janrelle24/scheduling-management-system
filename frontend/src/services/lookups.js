import { db } from '../data/store'
import { DISPLAY_STATUSES, getDisplayStatus } from '../utils/status'

// Small shared lookups used by several services.
export function findAppointmentForRequest(requestId) {
    return db.appointments.find((appointment) => appointment.requestId === requestId) ?? null
}

export function getUserName(userId) {
    return db.users.find((user) => user.id === userId)?.fullName ?? null
}

// { pending: 7, confirmed: 12, ... } using one display status per request
export function countByDisplayStatus(requests) {
    const counts = Object.fromEntries(DISPLAY_STATUSES.map((status) => [status, 0]))
    for (const request of requests) {
        counts[getDisplayStatus(request, findAppointmentForRequest(request.id))] += 1
    }
    return counts
}