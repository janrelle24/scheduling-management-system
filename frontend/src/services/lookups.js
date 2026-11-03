import { db } from '../data/store'

// Small shared lookups used by several services.
export function findAppointmentForRequest(requestId) {
    return db.appointments.find((appointment) => appointment.requestId === requestId) ?? null
}

export function getUserName(userId) {
    return db.users.find((user) => user.id === userId)?.fullName ?? null
}
