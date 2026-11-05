import { STATUS_LABELS } from './status'

export const NOTIFICATION_LABELS = {
    acknowledgement: 'Acknowledgement',
    approval: 'Approval',
    rejection: 'Rejection',
    cancellation: 'Cancellation',
    reschedule: 'Reschedule update',
}

// Turns one status-history row into the heading shown to staff.
function describeStatusChange(row, source) {
    const { oldStatus, newStatus } = row
    if (!oldStatus) {
        return source === 'in_person' ? 'Encoded in person → Pending' : 'Submitted online → Pending'
    }
    if (oldStatus === 'pending' && newStatus === 'confirmed') return 'Approved → Confirmed'
    if (oldStatus === 'pending' && newStatus === 'rejected') return 'Rejected'
    if (oldStatus === 'pending' && newStatus === 'cancelled') return 'Request cancelled'
    if (oldStatus === 'confirmed' && newStatus === 'confirmed') return 'Rescheduled'
    if (oldStatus === 'confirmed' && newStatus === 'cancelled') return 'Appointment cancelled'
    if (oldStatus === 'confirmed' && newStatus === 'completed') return 'Marked completed'
    return `${STATUS_LABELS[oldStatus] ?? oldStatus} → ${STATUS_LABELS[newStatus] ?? newStatus}`
}

// One chronological list for the "Status history" card, built from three records the
// API already returns for a request:
//   statusHistory  → "Approved → Confirmed" (with who and the reason)
//   notifications  → "Acknowledgement email sent" (only emails that were sent)
//   activity       → "Viewed by Marco Reyes" (only 'request.viewed' audit entries)
// Returns [{ id, kind, at, title, actor, reason }], oldest first.
// When two entries share the same time: status change first, then email, then view.
const KIND_ORDER = { status: 0, email: 1, viewed: 2 }

export function buildTimeline({ source, statusHistory = [], notifications = [], activity = [] }) {
    const events = []

    for (const row of statusHistory) {
        events.push({
        id: row.id,
        kind: 'status',
        at: row.changedAt,
        title: describeStatusChange(row, source),
        actor: row.changedByName ?? 'System',
        reason: row.reason ?? null,
        })
    }

    for (const row of notifications) {
        if (row.status !== 'sent') continue // queued and failed emails show in the Notifications card
        const label = NOTIFICATION_LABELS[row.templateKey] ?? row.templateKey
        events.push({
        id: row.id,
        kind: 'email',
        at: row.sentAt ?? row.createdAt,
        title: `${label} email sent`,
        actor: null,
        reason: null,
        })
    }

    for (const row of activity) {
        if (row.action !== 'request.viewed') continue
        events.push({
        id: row.id,
        kind: 'viewed',
        at: row.createdAt,
        title: `Viewed by ${row.actorName ?? 'a staff member'}`,
        actor: null,
        reason: null,
        })
    }

    // Compare real instants (not strings), so different offsets can't misorder entries.
    return events.sort(
        (a, b) => new Date(a.at) - new Date(b.at) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind],
    )
}