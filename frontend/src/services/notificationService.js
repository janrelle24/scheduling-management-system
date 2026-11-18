// Mirrors: GET /api/v1/admin/email-notifications  and  (PROPOSED) POST .../email-notifications/:id/retry
// Both need email_notifications.view, an explicitly granted permission (Phase 2). Anyone else gets
// 403, no rows, and the attempt is recorded as a security event.
import { db } from '../data/store'
import { NOTIFICATION_LABELS } from '../utils/requestTimeline'
import { PERMISSIONS } from '../utils/permissions'
import { plusMinutes } from '../utils/datetime'
import { ApiError } from './ApiError'
import { nowIso } from './decisions'
import { mockApi, paginate } from './mockApi'
import { getEmailFault } from './mockFaults'
import { requireAuthorized } from './security'

const RETRY_DELAY_MINUTES = 30 // how soon a failed retry is tried again (the office has not set a policy)

const requireViewer = () => requireAuthorized(PERMISSIONS.EMAIL_NOTIFICATIONS_VIEW, 'Email notifications')

function toRow(row) {
    const request = db.requests.find((r) => r.id === row.requestId)
    return { ...row, referenceNumber: request?.referenceNumber ?? null }
}

// params: { status, page, pageSize }. Newest first.
// Also returns failedCount and failedErrors over ALL failed emails (not only this page),
// for the "N emails failed" banner (FR-23: failures are available for review).
export function listEmailNotifications({ status = '', page = 1, pageSize = 10 } = {}) {
    return mockApi(() => {
        requireViewer()
        const rows = db.notifications
            .filter((row) => !status || row.status === status)
            .map(toRow)
            .sort((a, b) => 
                b.createdAt.localeCompare(a.createdAt) ||
                db.notifications.findIndex((n) => n.id === b.id) - db.notifications.findIndex((n) => n.id === a.id),
            )
        const failed = db.notifications.filter((row) => row.status === 'failed')
        return {
            ...paginate(rows, page, pageSize),
            failedCount: failed.length,
            failedErrors: [...new Set(failed.map((row) => row.lastError).filter(Boolean))],
        }
    })
}


// POST /admin/email-notifications/:id/retry  -> { notification, result: 'sent' | 'failed' }
// Only a FAILED email can be retried (409 not_failed, with the current row, if it was already sent).
// The request or appointment is never touched: an email failure or success cannot change its status
// (FR-23, API-09). Every retry is audited. In the mock, the DEV "Decision emails" setting decides
// whether the retry succeeds; the real backend sends it for real.
export function retryEmailNotification(id) {
    return mockApi(() => {
        const actor = requireViewer()
        const row = db.notifications.find((candidate) => candidate.id === id)
        if (!row) throw new ApiError(404, 'not_found', 'Email not found.')
        if (row.status !== 'failed') {
            throw new ApiError(409, 'not_failed', 'This email is not waiting for a retry.', { notification: toRow(row) })
        }
    
        const at = nowIso()
        const failsAgain = getEmailFault() === 'fail'
        row.attemptCount += 1
        if (failsAgain) {
            row.lastError = 'Mailbox unavailable'
            row.nextAttemptAt = plusMinutes(at, RETRY_DELAY_MINUTES)
        } else {
            row.status = 'sent'
            row.sentAt = at
            row.lastError = null
            row.nextAttemptAt = null
        }
    
        const request = db.requests.find((r) => r.id === row.requestId)
        db.auditLogs.push({
            id: `aud-new-${db.auditLogs.length + 1}`,
            userId: actor.id,
            action: 'notification.retried',
            entityType: 'email_notification',
            entityId: row.id,
            details: {
            referenceNumber: request?.referenceNumber ?? null,
            template: NOTIFICATION_LABELS[row.templateKey] ?? row.templateKey,
            result: failsAgain ? 'failed' : 'sent',
            },
            ipAddress: null,
            createdAt: at,
        })
        return { notification: toRow(row), result: failsAgain ? 'failed' : 'sent' }
    })
}
