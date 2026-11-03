// Builds the fictional sample data (all names, emails and phone numbers are made up).
//
// How it works:
//   1. A list of "specs" describes each request and what happened to it.
//   2. buildSeedData() turns every spec into rows for the Phase 2 tables:
//      requests, appointments, status history, email notifications and audit logs.
//   Because history, emails and audit rows are generated from the same specs,
//   the screens can never contradict each other.
//
// Shape: 65 requests, REQ-2026-0078 ... REQ-2026-0142 (numbered in order of submission).
//   Pending 7, Confirmed 12, Rejected 3, Cancelled 2, Completed 41.
import { MOCK_NOW_ISO } from '../utils/clock'
import { addDays, manilaIso as at, plusMinutes } from '../utils/datetime'

const MARCO = 'user-marco'
const ELENA = 'user-elena'
const LIZA = 'user-liza'

const pad = (n) => String(n).padStart(4, '0')
const P = (date, start, end) => ({ date, start, end }) // a date plus start/end clock times

// ---------------------------------------------------------------------------
// 1. Hand-written "story" records (the ones visible in the UI designs)
// ---------------------------------------------------------------------------
const STORY_SPECS = [
  // --- Pending (7 in total; 4 more are generated below as 0134, 0131, 0127) ---
    {
        n: 142,
        name: 'Maria Santos',
        email: 'maria.santos@email.com',
        phone: '0917 000 0000',
        source: 'online',
        purpose: 'Request support letter for the youth sports program.',
        preferred: P('2026-10-27', '09:30', '10:30'),
        createdAt: at('2026-10-26', '08:12'),
        outcome: { type: 'pending' },
        viewedBy: { userId: MARCO, at: at('2026-10-26', '09:05') },
    },
    {
        n: 141,
        name: 'Juan Dela Cruz',
        email: 'juan.dc@email.com',
        phone: '0917 111 2222',
        source: 'in_person',
        purpose: 'Courtesy call from barangay council',
        preferred: P('2026-10-28', '14:00', '15:00'),
        createdAt: at('2026-10-26', '05:10'), // early, so the dashboard shows "5h ago" like the design
        outcome: { type: 'pending' },
        ackQueued: true,
    },
    {
        n: 139,
        name: 'Ana Reyes',
        email: 'ana.reyes@email.com',
        phone: null,
        source: 'online',
        purpose: 'Invitation to the community health fair',
        preferred: P('2026-10-29', '10:00', '11:00'),
        createdAt: at('2026-10-25', '09:00'),
        outcome: { type: 'pending' },
    },
    {
        n: 137,
        name: 'Pedro Lim',
        email: 'pedro.lim@email.com',
        phone: null,
        source: 'online',
        purpose: 'Business permit follow-up (new request after REQ-0133)',
        preferred: P('2026-10-30', '13:00', '14:00'),
        createdAt: at('2026-10-24', '09:00'),
        outcome: { type: 'pending' },
    },
    {
        n: 134,
        name: 'Lorna Bautista',
        email: 'lorna.bautista@example.com',
        phone: null,
        source: 'online',
        purpose: 'Scholarship program inquiry',
        preferred: P('2026-10-28', '11:00', '12:00'),
        createdAt: at('2026-10-23', '14:20'),
        outcome: { type: 'pending' },
    },
    {
        n: 131,
        name: 'Ramon Villanueva',
        email: 'ramon.villanueva@example.com',
        phone: null,
        source: 'online',
        purpose: 'Invitation to the barangay anniversary celebration',
        preferred: P('2026-11-02', '09:00', '10:00'),
        createdAt: at('2026-10-22', '11:05'),
        outcome: { type: 'pending' },
    },
    {
        n: 127,
        name: 'Teresita Mendoza',
        email: null,
        phone: '0917 000 4127',
        source: 'in_person',
        purpose: 'Senior citizens association concerns',
        preferred: P('2026-10-29', '15:00', '16:00'),
        createdAt: at('2026-10-21', '15:30'),
        outcome: { type: 'pending' },
    },

  // --- Confirmed (12) ---
    {
        n: 140,
        name: 'Municipal Council',
        email: 'council.secretariat@example.com',
        phone: null,
        source: 'online',
        purpose: 'Council session',
        preferred: P('2026-10-30', '09:00', '11:00'),
        createdAt: at('2026-10-25', '18:30'),
        outcome: {
        type: 'confirmed',
        appt: P('2026-10-30', '09:00', '11:00'),
        approvedAt: at('2026-10-26', '08:30'),
        },
    },
    {
        n: 138,
        name: 'Media Affairs Office',
        email: 'media.affairs@example.com',
        phone: null,
        source: 'online',
        purpose: 'Press briefing',
        preferred: P('2026-10-28', '10:00', '11:00'),
        createdAt: at('2026-10-25', '08:00'),
        outcome: {
        type: 'confirmed',
        appt: P('2026-10-28', '10:00', '11:00'),
        approvedAt: at('2026-10-26', '09:41'),
        },
    },
    {
        n: 136,
        name: 'Ana Reyes',
        email: 'ana.reyes@email.com',
        phone: null,
        source: 'online',
        purpose: 'Courtesy call about the senior citizens program',
        preferred: P('2026-10-29', '10:00', '11:00'),
        createdAt: at('2026-10-24', '08:30'),
        outcome: {
        type: 'confirmed',
        appt: P('2026-10-29', '14:00', '15:00'), // moved from 9:00 AM
        approvedAt: at('2026-10-24', '10:00'),
        rescheduled: { fromAppt: P('2026-10-29', '09:00', '10:00'), at: at('2026-10-26', '09:12') },
        },
    },
    {
        n: 135,
        name: 'Department heads',
        email: 'dept.heads@example.com',
        phone: null,
        source: 'online',
        purpose: 'Department heads coordination meeting',
        preferred: P('2026-10-27', '09:00', '10:00'),
        createdAt: at('2026-10-23', '16:00'),
        outcome: {
        type: 'confirmed',
        appt: P('2026-10-27', '09:00', '10:00'),
        approvedAt: at('2026-10-24', '09:00'),
        },
    },
    {
        n: 132,
        name: 'Public Works Office',
        email: 'public.works@example.com',
        phone: null,
        source: 'online',
        purpose: 'Site visit',
        preferred: P('2026-10-27', '15:00', '16:00'),
        createdAt: at('2026-10-23', '09:10'),
        outcome: {
        type: 'confirmed',
        appt: P('2026-10-27', '15:00', '16:00'),
        approvedAt: at('2026-10-23', '11:00'),
        },
    },
    {
        n: 130,
        name: 'City Budget Office',
        email: 'budget.office@example.com',
        phone: null,
        source: 'online',
        purpose: 'Budget consultation',
        preferred: P('2026-10-26', '14:00', '15:00'),
        createdAt: at('2026-10-22', '09:30'),
        outcome: {
        type: 'confirmed',
        appt: P('2026-10-26', '14:00', '15:00'),
        approvedAt: at('2026-10-22', '15:00'),
        },
    },
    {
        n: 126,
        name: 'Rotary Club',
        email: 'rotary.club@example.com',
        phone: null,
        source: 'online',
        purpose: 'Rotary Club delegation',
        preferred: P('2026-10-26', '11:00', '11:30'),
        createdAt: at('2026-10-20', '16:40'),
        outcome: {
        type: 'confirmed',
        appt: P('2026-10-26', '11:00', '11:30'),
        approvedAt: at('2026-10-21', '09:00'),
        },
    },
    {
        n: 125,
        name: 'Barangay officials',
        email: 'barangay.officials@example.com',
        phone: null,
        source: 'online',
        purpose: 'Courtesy call, Barangay officials',
        preferred: P('2026-10-26', '09:00', '10:00'),
        createdAt: at('2026-10-20', '10:15'),
        outcome: {
        type: 'confirmed',
        appt: P('2026-10-26', '09:00', '10:00'),
        approvedAt: at('2026-10-20', '14:00'),
        },
    },
    {
        n: 124,
        name: 'Cecilia Domingo',
        email: 'cecilia.domingo@example.com',
        phone: null,
        source: 'online',
        purpose: 'Livelihood program proposal',
        preferred: P('2026-11-05', '13:00', '14:00'),
        createdAt: at('2026-10-20', '09:40'),
        outcome: {
        type: 'confirmed',
        appt: P('2026-11-05', '13:00', '14:00'),
        approvedAt: at('2026-10-20', '15:30'),
        },
    },
    {
        n: 123,
        name: 'Alfredo Samonte',
        email: null,
        phone: '0917 000 4123',
        source: 'in_person',
        purpose: 'Request for road repair in Purok 3',
        preferred: P('2026-11-04', '09:00', '10:00'),
        createdAt: at('2026-10-20', '08:30'),
        outcome: {
        type: 'confirmed',
        appt: P('2026-11-04', '09:00', '10:00'),
        approvedAt: at('2026-10-20', '11:00'),
        },
    },
    {
        n: 122,
        name: 'Youth Council',
        email: 'youth.council@example.com',
        phone: null,
        source: 'online',
        purpose: 'Youth leadership summit planning',
        preferred: P('2026-11-03', '14:00', '15:00'),
        createdAt: at('2026-10-19', '13:00'),
        outcome: {
        type: 'confirmed',
        appt: P('2026-11-03', '14:00', '15:00'),
        approvedAt: at('2026-10-20', '08:45'),
        },
    },
    {
        n: 121,
        name: 'Josefina Cortez',
        email: 'josefina.cortez@example.com',
        phone: null,
        source: 'online',
        purpose: 'Courtesy call from the Women\'s Association',
        preferred: P('2026-11-02', '10:00', '11:00'),
        createdAt: at('2026-10-19', '09:00'),
        outcome: {
        type: 'confirmed',
        appt: P('2026-11-02', '10:00', '11:00'),
        approvedAt: at('2026-10-19', '15:00'),
        },
    },

  // --- Rejected (3) ---
    {
        n: 133,
        name: 'Pedro Lim',
        email: 'pedro.lim@email.com',
        phone: null,
        source: 'online',
        purpose: 'Business permit follow-up',
        preferred: P('2026-10-30', '13:00', '14:00'),
        createdAt: at('2026-10-23', '10:00'),
        outcome: {
        type: 'rejected',
        at: at('2026-10-25', '11:30'),
        reason: 'The requested time falls in a period when the Vice Mayor is out of office.',
        },
    },
    {
        n: 128,
        name: 'Gilbert Navarro',
        email: 'gilbert.navarro@example.com',
        phone: null,
        source: 'online',
        purpose: 'Request for event sponsorship',
        preferred: P('2026-10-27', '10:00', '11:00'),
        createdAt: at('2026-10-22', '08:00'),
        outcome: {
        type: 'rejected',
        at: at('2026-10-22', '13:00'),
        reason: 'Outside the scope of this office. Please coordinate with the Mayor\'s Office.',
        },
    },
    {
        n: 111,
        name: 'Marites Soriano',
        email: 'marites.soriano@example.com',
        phone: null,
        source: 'online',
        purpose: 'Meeting about the market vendors\' concerns',
        preferred: P('2026-10-15', '14:00', '15:00'),
        createdAt: at('2026-10-13', '10:00'),
        outcome: {
        type: 'rejected',
        at: at('2026-10-13', '15:00'),
        reason: 'The requested time is already taken by another appointment.',
        },
    },

  // --- Cancelled (2) ---
    {
        n: 129,
        name: 'Rosa Tan',
        email: null,
        phone: '0917 000 4129',
        source: 'in_person',
        purpose: 'Consultation about the day care center',
        preferred: P('2026-10-22', '15:00', '16:00'),
        createdAt: at('2026-10-22', '08:45'),
        outcome: {
        type: 'cancelledAppointment',
        appt: P('2026-10-22', '15:00', '16:00'),
        approvedAt: at('2026-10-22', '09:20'),
        at: at('2026-10-22', '11:00'),
        reason: 'The requester can no longer attend.',
        },
    },
    {
        n: 95,
        name: 'Dennis Aquino',
        email: 'dennis.aquino@example.com',
        phone: null,
        source: 'online',
        purpose: 'Request for a barangay clearance endorsement',
        preferred: P('2026-10-09', '16:00', '17:00'),
        createdAt: at('2026-10-06', '10:00'),
        outcome: {
        type: 'cancelledRequest',
        at: at('2026-10-07', '09:30'),
        reason: 'The requester withdrew the request.',
        },
    },
]

// ---------------------------------------------------------------------------
// 2. Generated "completed" records (41), one per past appointment slot.
//    Slots are fixed times on weekdays, so they can never overlap.
// ---------------------------------------------------------------------------
const FIRST_NAMES = ['Rosario', 'Danilo', 'Cecilia', 'Alfredo', 'Imelda', 'Rodrigo', 'Nenita', 'Efren', 'Corazon', 'Armando', 'Luzviminda', 'Benito', 'Josefina', 'Reynaldo', 'Evangeline']
const LAST_NAMES = ['Aquino', 'Bernardo', 'Castillo', 'Dizon', 'Espiritu', 'Fernandez', 'Gonzales', 'Hernandez', 'Ignacio', 'Javier', 'Lacson', 'Magsaysay', 'Natividad', 'Ocampo', 'Pascual']
const PURPOSES = [
    'Request for a support letter',
    'Courtesy call',
    'Invitation to a community event',
    'Consultation about a local ordinance',
    'Request for assistance for a constituent',
    'Meeting with the homeowners association',
    'Discussion of a livelihood program',
    'Request for a speaker at a school event',
    'Follow-up on a previous request',
    'Introduction of a new organization',
]

function completedSlots() {
    const days = [
        '2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09',
        '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-19', '2026-10-20',
    ]
    const slots = []
    for (const date of days) {
        if (date === '2026-10-20') {
        slots.push(P(date, '09:00', '10:00')) // only one slot: it is REQ-0120
        continue
        }
        slots.push(P(date, '09:00', '10:00'), P(date, '11:00', '12:00'), P(date, '14:00', '15:00'))
        if (date === '2026-10-01') slots.push(P(date, '15:30', '16:30'))
    }
    return slots // 41 slots, in time order
}

function buildCompletedSpecs() {
    const takenNumbers = new Set([...STORY_SPECS.map((spec) => spec.n)])
    const numbers = []
    for (let n = 78; n <= 120; n += 1) if (!takenNumbers.has(n)) numbers.push(n) // 41 numbers

    return completedSlots().map((slot, i) => {
        const n = numbers[i]
        const first = FIRST_NAMES[i % FIRST_NAMES.length]
        const last = LAST_NAMES[(i * 4 + 3) % LAST_NAMES.length]
        const inPerson = i % 4 === 0
        const hasEmail = !inPerson || i % 8 === 0
        // Requests are submitted two days before the appointment (but not before Oct 1).
        const candidate = addDays(slot.date, -2)
        const createdAt =
        candidate < '2026-10-01'
            ? at('2026-10-01', `00:${String(10 + i * 5).padStart(2, '0')}`)
            : at(candidate, '10:00')

        const isCarlo = n === 120
        return {
        n,
        name: isCarlo ? 'Carlo Go' : `${first} ${last}`,
        email: hasEmail ? `${first}.${last}@example.com`.toLowerCase() : null,
        phone: hasEmail && !inPerson ? null : `0917 000 ${String(2000 + i).padStart(4, '0')}`,
        source: isCarlo ? 'online' : inPerson ? 'in_person' : 'online',
        purpose: isCarlo ? 'Courtesy call from the sports association' : PURPOSES[i % PURPOSES.length],
        preferred: slot,
        createdAt,
        outcome: { type: 'completed', appt: slot, approvedAt: plusMinutes(createdAt, 180) },
        }
    })
}

// ---------------------------------------------------------------------------
// 3. Turn specs into table rows
// ---------------------------------------------------------------------------
function buildSettings() {
    return {
        timezone: 'Asia/Manila',
        workingHours: [
        { label: 'Mon–Fri', daysOfWeek: [1, 2, 3, 4, 5], start: '08:00', end: '17:00' },
        { label: 'Sat–Sun', daysOfWeek: [0, 6], start: null, end: null }, // closed
        ],
        defaultDurationMinutes: 60,
        bufferMinutes: 0,
        requireReasonOnRejectCancel: true,
        emailOnDecision: true,
        sendAcknowledgement: true,
        retentionMonths: 24,
        unavailable: [
        { id: 'unv-001', label: 'Christmas Day', date: '2026-12-25', start: null, end: null },
        { id: 'unv-002', label: 'Out of office', date: '2026-10-30', start: '13:00', end: '17:00' },
        ],
        // Mock-only flag. These values are PLACEHOLDERS, not approved office policy.
        policyStatus: 'placeholder',
    }
}

export function buildSeedData() {
    const requests = []
    const appointments = []
    const statusHistory = []
    const notifications = []
    const auditLogs = []

    const specs = [...STORY_SPECS, ...buildCompletedSpecs()].sort((a, b) => a.n - b.n)

    for (const spec of specs) {
        const id = `req-${pad(spec.n)}`
        const referenceNumber = `REQ-2026-${pad(spec.n)}`
        const outcome = spec.outcome
        const encodedBy = spec.source === 'in_person' ? MARCO : null
        let lastEventAt = spec.createdAt

        // Small helpers that add rows for this request.
        let counter = 0
        const nextKey = () => `${pad(spec.n)}-${(counter += 1)}`
        const touch = (iso) => {
        if (iso > lastEventAt) lastEventAt = iso
        }
        const addHistory = (oldStatus, newStatus, changedBy, reason, changedAt, appointmentId = null) => {
        touch(changedAt)
        statusHistory.push({
            id: `hist-${nextKey()}`,
            requestId: id,
            appointmentId,
            oldStatus,
            newStatus,
            changedBy,
            reason,
            changedAt,
        })
        }
        const addAudit = (userId, action, entityType, entityId, details, createdAt) => {
        auditLogs.push({
            id: `aud-${nextKey()}`,
            userId,
            action,
            entityType,
            entityId,
            details: { referenceNumber, ...details },
            ipAddress: null,
            createdAt,
        })
        }
        const addEmail = (templateKey, createdAt, extra = {}) => {
        if (!spec.email) return // no email address: no notifications are sent
        touch(createdAt)
        notifications.push({
            id: `ntf-${nextKey()}`,
            requestId: id,
            appointmentId: null,
            recipientEmail: spec.email,
            templateKey,
            status: 'sent',
            attemptCount: 1,
            lastError: null,
            nextAttemptAt: null,
            createdAt,
            sentAt: createdAt,
            ...extra,
        })
    }

    // Submission
    addHistory(null, 'pending', encodedBy, null, spec.createdAt)
    if (encodedBy) addAudit(encodedBy, 'request.created', 'appointment_request', id, {}, spec.createdAt)
    if (spec.ackQueued) {
        addEmail('acknowledgement', plusMinutes(spec.createdAt, 1), {
            status: 'queued',
            attemptCount: 0,
            nextAttemptAt: MOCK_NOW_ISO,
            sentAt: null,
        })
        } else {
        addEmail('acknowledgement', plusMinutes(spec.createdAt, 1))
        }
        if (spec.viewedBy) {
        addAudit(spec.viewedBy.userId, 'request.viewed', 'appointment_request', id, {}, spec.viewedBy.at)
    }

    // Outcome
    let requestStatus = 'pending'

    if (outcome.type === 'rejected') {
        requestStatus = 'rejected'
        addHistory('pending', 'rejected', MARCO, outcome.reason, outcome.at)
        addAudit(MARCO, 'request.rejected', 'appointment_request', id, { reason: outcome.reason }, outcome.at)
        addEmail('rejection', plusMinutes(outcome.at, 1))
    }

    if (outcome.type === 'cancelledRequest') {
        requestStatus = 'cancelled'
        addHistory('pending', 'cancelled', MARCO, outcome.reason, outcome.at)
        addAudit(MARCO, 'request.cancelled', 'appointment_request', id, { reason: outcome.reason }, outcome.at)
        addEmail('cancellation', plusMinutes(outcome.at, 1))
    }

    if (['confirmed', 'completed', 'cancelledAppointment'].includes(outcome.type)) {
        const appointmentId = `apt-${pad(spec.n)}`
        const startAt = at(outcome.appt.date, outcome.appt.start)
        const endAt = at(outcome.appt.date, outcome.appt.end)
        requestStatus = outcome.type === 'cancelledAppointment' ? 'cancelled' : 'confirmed'
        const appointment = {
            id: appointmentId,
            requestId: id,
            startAt,
            endAt,
            status: outcome.type === 'confirmed' ? 'confirmed' : outcome.type === 'completed' ? 'completed' : 'cancelled',
            confirmedBy: MARCO,
            createdAt: outcome.approvedAt,
            updatedAt: outcome.approvedAt,
        }
        addHistory('pending', 'confirmed', MARCO, null, outcome.approvedAt, appointmentId)
        addAudit(MARCO, 'request.approved', 'appointment_request', id, {}, outcome.approvedAt)
        addEmail('approval', plusMinutes(outcome.approvedAt, 1))

        if (outcome.rescheduled) {
            const rescheduledAt = outcome.rescheduled.at
            const fromStartAt = at(outcome.rescheduled.fromAppt.date, outcome.rescheduled.fromAppt.start)
            appointment.updatedAt = rescheduledAt
            addHistory('confirmed', 'confirmed', MARCO, 'Rescheduled to a new time', rescheduledAt, appointmentId)
            addAudit(MARCO, 'appointment.rescheduled', 'appointment', appointmentId, { fromStartAt, toStartAt: startAt }, rescheduledAt)
            // This email failed, so the notification screens have a failed example.
            if (spec.email) {
            touch(plusMinutes(rescheduledAt, 1))
            notifications.push({
                id: `ntf-${nextKey()}`,
                requestId: id,
                appointmentId,
                recipientEmail: spec.email,
                templateKey: 'reschedule',
                status: 'failed',
                attemptCount: 2,
                lastError: 'Mailbox unavailable',
                nextAttemptAt: at('2026-10-26', '11:00'),
                createdAt: plusMinutes(rescheduledAt, 1),
                sentAt: null,
            })
            }
        }

        if (outcome.type === 'completed') {
            appointment.updatedAt = endAt
            addHistory('confirmed', 'completed', MARCO, null, endAt, appointmentId)
            addAudit(MARCO, 'appointment.completed', 'appointment', appointmentId, {}, endAt)
        }

        if (outcome.type === 'cancelledAppointment') {
            appointment.updatedAt = outcome.at
            addHistory('confirmed', 'cancelled', MARCO, outcome.reason, outcome.at, appointmentId)
            addAudit(MARCO, 'appointment.cancelled', 'appointment', appointmentId, { reason: outcome.reason }, outcome.at)
            addEmail('cancellation', plusMinutes(outcome.at, 1))
        }

        appointments.push(appointment)
        touch(appointment.updatedAt)
    }

    requests.push({
        id,
        referenceNumber,
        source: spec.source,
        requesterName: spec.name,
        requesterEmail: spec.email,
        requesterPhone: spec.phone,
        purpose: spec.purpose,
        preferredStartAt: at(spec.preferred.date, spec.preferred.start),
        preferredEndAt: at(spec.preferred.date, spec.preferred.end),
        status: requestStatus,
        encodedBy,
        createdAt: spec.createdAt,
        updatedAt: lastEventAt,
        })
    }

    // A few audit events that are not tied to one request.
    auditLogs.push(
        {
        id: 'aud-sys-1',
        userId: null,
        action: 'auth.login_failed',
        entityType: 'user',
        entityId: null,
        details: { email: 'staff@office.gov.ph', result: 'failed' },
        ipAddress: null,
        createdAt: at('2026-10-26', '08:50'),
        },
        {
        id: 'aud-sys-2',
        userId: ELENA,
        action: 'user.permissions_changed',
        entityType: 'user',
        entityId: 'user-ben',
        details: { targetName: 'Ben Ortiz' },
        ipAddress: null,
        createdAt: at('2026-10-25', '16:20'),
        },
        {
        id: 'aud-sys-3',
        userId: LIZA,
        action: 'report.exported',
        entityType: 'report',
        entityId: null,
        details: { report: 'Status summary' },
        ipAddress: null,
        createdAt: at('2026-10-25', '15:02'),
        },
    )

    return { requests, appointments, statusHistory, notifications, auditLogs, settings: buildSettings() }
}
