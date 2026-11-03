// DEVELOPMENT ONLY. Rules the sample data must always follow.
// Shown on /dev/mock-data so a mistake in the sample data is caught immediately.
import { db } from '../../data/store'
import { MOCK_NOW_ISO } from '../../utils/clock'
import { dayOfWeek, getManilaDateStr, getManilaTimeStr } from '../../utils/datetime'
import { overlaps } from '../../utils/scheduling'
import { getDisplayStatus } from '../../utils/status'

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/
const EXPECTED_COUNTS = { pending: 7, confirmed: 12, rejected: 3, cancelled: 2, completed: 41 }

function appointmentOf(request) {
    return db.appointments.find((row) => row.requestId === request.id) ?? null
}

export function runMockDataChecks() {
    const results = []
    const check = (name, problems) =>
        results.push({ name, pass: problems.length === 0, detail: problems.slice(0, 3).join('; ') })

    // 1. Counts match the dashboard / reports in the UI designs
    const counts = { pending: 0, confirmed: 0, rejected: 0, cancelled: 0, completed: 0 }
    for (const request of db.requests) counts[getDisplayStatus(request, appointmentOf(request))] += 1
    check(
        `Status counts are ${JSON.stringify(EXPECTED_COUNTS)}`,
        Object.keys(EXPECTED_COUNTS)
        .filter((status) => counts[status] !== EXPECTED_COUNTS[status])
        .map((status) => `${status}: ${counts[status]}`),
    )

    // 2. Reference numbers 0078..0142, unique
    const numbers = db.requests.map((r) => Number(r.referenceNumber.slice(-4))).sort((a, b) => a - b)
    check(
        '65 requests numbered 0078 to 0142 with no gaps or duplicates',
        numbers.length === 65 && numbers.every((n, i) => n === 78 + i) ? [] : [`${numbers.length} requests`],
    )

    // 3. Submission order follows the reference number
    const byNumber = [...db.requests].sort((a, b) => a.referenceNumber.localeCompare(b.referenceNumber))
    check(
        'Higher reference numbers were submitted later (or at the same time)',
        byNumber.flatMap((r, i) => (i > 0 && r.createdAt < byNumber[i - 1].createdAt ? [r.referenceNumber] : [])),
    )

    // 4. No overlapping confirmed appointments (half-open ranges)
    const confirmed = db.appointments.filter((a) => a.status === 'confirmed')
    const overlapProblems = []
    for (let i = 0; i < confirmed.length; i += 1) {
        for (let j = i + 1; j < confirmed.length; j += 1) {
        if (overlaps(confirmed[i].startAt, confirmed[i].endAt, confirmed[j].startAt, confirmed[j].endAt)) {
            overlapProblems.push(`${confirmed[i].id} / ${confirmed[j].id}`)
        }
        }
    }
    check('No two confirmed appointments overlap', overlapProblems)

    // 5. Appointments are on working days, inside working hours, and end after they start
    const hours = db.settings.workingHours
    const timeProblems = db.appointments.flatMap((a) => {
        const date = getManilaDateStr(a.startAt)
        const rule = hours.find((h) => h.daysOfWeek.includes(dayOfWeek(date)))
        const start = getManilaTimeStr(a.startAt)
        const end = getManilaTimeStr(a.endAt)
        const ok = rule?.start && start >= rule.start && end <= rule.end && a.endAt > a.startAt
        return ok ? [] : [a.id]
    })
    check('Appointments are on working days, within working hours, and end after they start', timeProblems)

    // 6. Confirmed appointments avoid holidays / unavailable periods
    const unavailableProblems = confirmed.filter((a) =>
        db.settings.unavailable.some((u) => {
        if (u.date !== getManilaDateStr(a.startAt)) return false
        if (!u.start) return true
        return getManilaTimeStr(a.startAt) < u.end && getManilaTimeStr(a.endAt) > u.start
        }),
    )
    check('Confirmed appointments avoid unavailable periods', unavailableProblems.map((a) => a.id))

    // 7. Every timestamp has the +08:00 offset
    const tables = ['requests', 'appointments', 'statusHistory', 'notifications', 'auditLogs']
    const timestampProblems = []
    for (const table of tables) {
        for (const row of db[table]) {
        for (const [key, value] of Object.entries(row)) {
            const isTime = key.endsWith('At') && value
            if (isTime && !TIMESTAMP.test(value)) timestampProblems.push(`${table}.${key}=${value}`)
        }
        }
    }
    check('All timestamps are ISO strings ending in +08:00', timestampProblems)

    // 8. Nothing happened in the future (retry times and appointment times may be future)
    const pastFields = {
        requests: ['createdAt', 'updatedAt'],
        appointments: ['createdAt', 'updatedAt'],
        statusHistory: ['changedAt'],
        notifications: ['createdAt', 'sentAt'],
        auditLogs: ['createdAt'],
    }
    const futureProblems = []
    for (const [table, fields] of Object.entries(pastFields)) {
        for (const row of db[table]) {
        for (const field of fields) {
            if (row[field] && new Date(row[field]) > new Date(MOCK_NOW_ISO)) futureProblems.push(`${table}.${row.id}.${field}`)
        }
        }
    }
    check('No recorded event is later than "now"', futureProblems)

    // 9. Links between tables are valid; every request has history
    const requestIds = new Set(db.requests.map((r) => r.id))
    const appointmentIds = new Set(db.appointments.map((a) => a.id))
    const userIds = new Set(db.users.map((u) => u.id))
    const linkProblems = []
    for (const r of db.requests) {
        if (!db.statusHistory.some((h) => h.requestId === r.id)) linkProblems.push(`${r.id} has no history`)
        if (r.encodedBy && !userIds.has(r.encodedBy)) linkProblems.push(`${r.id} encodedBy`)
    }
    for (const a of db.appointments) if (!requestIds.has(a.requestId)) linkProblems.push(`${a.id} request`)
    for (const n of db.notifications) if (!requestIds.has(n.requestId)) linkProblems.push(`${n.id} request`)
    for (const h of db.statusHistory) if (!requestIds.has(h.requestId)) linkProblems.push(`${h.id} request`)
    for (const l of db.auditLogs) {
        if (l.userId && !userIds.has(l.userId)) linkProblems.push(`${l.id} user`)
        if (l.entityType === 'appointment_request' && !requestIds.has(l.entityId)) linkProblems.push(`${l.id} entity`)
        if (l.entityType === 'appointment' && !appointmentIds.has(l.entityId)) linkProblems.push(`${l.id} entity`)
    }
    check('Every link between tables points to a real record', linkProblems)

    // 10. Request status matches its appointment
    const statusProblems = db.requests.flatMap((r) => {
        const a = appointmentOf(r)
        if (r.status === 'confirmed') return a && ['confirmed', 'completed'].includes(a.status) ? [] : [r.id]
        if (a) return r.status === 'cancelled' && a.status === 'cancelled' ? [] : [r.id]
        return ['pending', 'rejected', 'cancelled'].includes(r.status) ? [] : [r.id]
    })
    check('Request status and appointment status agree', statusProblems)

    // 11. Contact rule (BR: at least an email or a phone number)
    check(
        'Every request has an email or a phone number',
        db.requests.filter((r) => !r.requesterEmail && !r.requesterPhone).map((r) => r.id),
    )

    // 12. The story from the designs works
    const maria = db.requests.find((r) => r.referenceNumber.endsWith('0142'))
    const mariaConflicts = confirmed.filter((a) => overlaps(maria.preferredStartAt, maria.preferredEndAt, a.startAt, a.endAt))
    check(
        'REQ-0142 (Maria, Oct 27 9:30) conflicts with exactly one confirmed appointment',
        mariaConflicts.length === 1 ? [] : [`${mariaConflicts.length} conflicts`],
    )
    const today = getManilaDateStr(MOCK_NOW_ISO)
    const todays = confirmed.filter((a) => getManilaDateStr(a.startAt) === today)
    check("Today's appointments: 3 confirmed", todays.length === 3 ? [] : [`${todays.length}`])

    return results
}
