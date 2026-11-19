// Mirrors: GET /api/v1/admin/audit-logs  (read-only: there are no edit or delete functions)
import { db } from '../data/store'
import { formatTime, getManilaDateStr } from '../utils/datetime'
import { PERMISSIONS } from '../utils/permissions'
import { getUserName } from './lookups'
import { inDateRange, mockApi, paginate } from './mockApi'
import { requireAuthorized } from './security'

export const AUDIT_ACTIONS = [
    { value: 'request.created', label: 'Encoded request' },
    { value: 'request.viewed', label: 'Viewed request' },
    { value: 'request.approved', label: 'Approved request' },
    { value: 'request.rejected', label: 'Rejected request' },
    { value: 'request.cancelled', label: 'Cancelled request' },
    { value: 'appointment.rescheduled', label: 'Rescheduled appointment' },
    { value: 'appointment.cancelled', label: 'Cancelled appointment' },
    { value: 'appointment.completed', label: 'Marked completed' },
    { value: 'report.exported', label: 'Exported report' },
    { value: 'notification.retried', label: 'Retried email' },
    { value: 'user.created', label: 'Created account' },
    { value: 'user.updated', label: 'Updated account' },
    { value: 'user.permissions_changed', label: 'Changed permissions' },
    { value: 'user.deactivated', label: 'Deactivated account' },
    { value: 'user.activated', label: 'Activated account' },
    { value: 'settings.changed', label: 'Changed scheduling settings' },
    { value: 'security.access_denied', label: 'Access denied' },
    { value: 'auth.login_failed', label: 'Login failed' },
]

// "9:00→2:00 PM" (drops the first AM/PM when both are the same)
function formatMove(fromIso, toIso) {
    const from = formatTime(fromIso)
    const to = formatTime(toIso)
    return `${from.slice(-2) === to.slice(-2) ? from.slice(0, -3) : from}→${to}`
}

// The "Record" column text.
function getRecordLabel(row) {
    const { details } = row
    if (row.action === 'appointment.rescheduled') {
        return `${details.referenceNumber} · ${formatMove(details.fromStartAt, details.toStartAt)}`
    }
    if (row.action === 'notification.retried') return `${details.referenceNumber} · ${details.template}`
    if (details.referenceNumber) return details.referenceNumber
    if (row.action === 'auth.login_failed') return details.email
    if (row.action === 'user.') return details.targetName ?? ''
    if (row.action === 'settings.changed') return 'Scheduling settings'
    if (row.action === 'security.access_denied') return details.attempted ?? ''
    if (row.action === 'report.exported') return details.format ? `${details.report} · ${details.format}` : details.report
    return ''
}

// params: { search, action, from, to, page, pageSize }. Newest first.
// Needs audit_logs.view (API-12: anyone else gets 403 and NO rows; the attempt is recorded).
// Each row has only what the screen shows: no IP address, no raw details, no account ids.
export function listAuditLogs({ search = '', action = '', from = '', to = '', page = 1, pageSize = 10 } = {}) {
    return mockApi(() => {
        requireAuthorized(PERMISSIONS.AUDIT_LOGS_VIEW, 'Audit log')
        const term = search.trim().toLowerCase()
        const labels = Object.fromEntries(AUDIT_ACTIONS.map((a) => [a.value, a.label]))
        const rows = db.auditLogs
        .map((row, index) => ({
            ...row, 
            index, // lets entries with the same time (the mock clock is fixed) keep their order
            // "Unknown" is shown when nobody was signed in (e.g. a failed login).
            actorName: getUserName(row.userId) ?? (row.action === 'auth.login_failed' ? 'Unknown' : 'System'),
            actionLabel: labels[row.action] ?? row.action,
            recordLabel: getRecordLabel(row),
            result: row.details.result === 'failed' ? 'failed' : 'success',
        }))
        .filter((row) => !action || row.action === action)
        .filter((row) => inDateRange(getManilaDateStr(row.createdAt), from, to))
        .filter(
            (row) =>
            !term ||
            row.actorName.toLowerCase().includes(term) ||
            row.actionLabel.toLowerCase().includes(term) ||
            row.recordLabel.toLowerCase().includes(term),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) ||  b.index - a.index )
        const shown = paginate(rows, page, pageSize)
        return {
            ...shown,
            items: shown.items.map(({ id, createdAt, actorName, action: actionValue, actionLabel, recordLabel, result }) => ({
                id,
                createdAt,
                actorName,
                action: actionValue,
                actionLabel,
                recordLabel,
                result,
            })),
        }
    })
}
