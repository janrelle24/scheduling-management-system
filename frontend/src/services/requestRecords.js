// Writes a brand-new pending request, shared by the public form and by staff encoding, so
// reference numbers, status history and the acknowledgement email work the same for both.
// In the real backend this runs inside the create endpoint's database transaction.
import { db } from '../data/store'
import { plusMinutes } from '../utils/datetime'
import { overlaps } from '../utils/scheduling'

// values: { name, email, phone, purpose, internalNotes } (already trimmed; '' means none)
// actor: the staff member who encoded it, or null for the public form
// Returns { request, acknowledgement: 'queued' | 'none' }.
export function insertPendingRequest({ source, values, startAt, endAt, actor = null, at }) {
    // The real backend creates the reference number securely (unique, hard to guess).
    const nextNumber = Math.max(...db.requests.map((r) => Number(r.referenceNumber.slice(-4)))) + 1
    const number = String(nextNumber).padStart(4, '0')

    const request = {
        id: `req-${number}`,
        referenceNumber: `REQ-2026-${number}`,
        source,
        requesterName: values.name,
        requesterEmail: values.email || null,
        requesterPhone: values.phone || null,
        purpose: values.purpose,
        internalNotes: values.internalNotes || null,
        preferredStartAt: startAt,
        preferredEndAt: endAt,
        status: 'pending',
        encodedBy: actor?.id ?? null,
        createdAt: at,
        updatedAt: at,
    }
    db.requests.push(request)
    db.statusHistory.push({
        id: `hist-${number}-1`,
        requestId: request.id,
        appointmentId: null,
        oldStatus: null,
        newStatus: 'pending',
        changedBy: actor?.id ?? null,
        reason: null,
        changedAt: at,
    })

    // Acknowledgement email: only with an address, and only if the office has it turned on.
    let acknowledgement = 'none'
    if (request.requesterEmail && db.settings.sendAcknowledgement !== false) {
        acknowledgement = 'queued'
        db.notifications.push({
            id: `ntf-${number}-1`,
            requestId: request.id,
            appointmentId: null,
            recipientEmail: request.requesterEmail,
            templateKey: 'acknowledgement',
            status: 'queued',
            attemptCount: 0,
            lastError: null,
            nextAttemptAt: at,
            createdAt: at,
            sentAt: null,
        })
    }
    return { request, acknowledgement }
}

// Not a block: a pending request reserves nothing. This only says the time may be taken
// already, so the person (or staff) can be told.
export function timeMayBeUnavailable(startAt, endAt) {
    const buffer = db.settings.bufferMinutes
    return db.appointments.some(
        (appointment) =>
            appointment.status === 'confirmed' &&
            overlaps(plusMinutes(startAt, -buffer), plusMinutes(endAt, buffer), appointment.startAt, appointment.endAt),
    )
}