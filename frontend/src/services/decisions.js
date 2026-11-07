// Pieces shared by every action that changes a request or appointment (approve, reject,
// cancel, reschedule). In the real backend this is the code that runs inside the single
// database transaction of each action. Not imported by any screen.
import { db } from '../data/store'
import { getNow } from '../utils/clock'
import { plusMinutes, toManilaIso } from '../utils/datetime'
import { ApiError } from './ApiError'
import { getEmailFault } from './mockFaults'

export const MAX_REASON_LENGTH = 500

// "Now" as a timestamp, the same shape as all stored times. 
export const nowIso = () => toManilaIso(getNow())

// Trims the reason and applies the office policy: required (settings) and at most 500
// characters. Throws 422 with a message for the reason field. Returns the text, or null.
export function normalizeReason(reason) {
    const text = (reason ?? '').trim()
    const refuse = (message) =>
        new ApiError(422, 'validation_failed', 'Please correct the highlighted fields.', {
            fieldErrors: { reason: message },
        })
    if (!text && db.settings.requireReasonOnRejectCancel) throw refuse('Enter a reason.')
    if (text.length > MAX_REASON_LENGTH) throw refuse(`Keep the reason under ${MAX_REASON_LENGTH} characters.`)
    return text || null
}

// One status-history row plus one audit entry: who did what, when, and why (FR-20, FR-30).
export function recordChange({ request, appointmentId = null, oldStatus, newStatus, actor, reason = null, at, audit }) {
    db.statusHistory.push({
        id: `hist-new-${db.statusHistory.length + 1}`,
        requestId: request.id,
        appointmentId,
        oldStatus,
        newStatus,
        changedBy: actor.id,
        reason,
        changedAt: at,
    })
    db.auditLogs.push({
        id: `aud-new-${db.auditLogs.length + 1}`,
        userId: actor.id,
        action: audit.action,
        entityType: audit.entityType,
        entityId: audit.entityId,
        details: { referenceNumber: request.referenceNumber, ...audit.details },
        ipAddress: null,
        createdAt: at,
    })
}

// Queues the email for a decision. Returns 'queued', 'failed' or 'none'.
//   none:   no email address on the request, or the office turned decision emails off
//   failed: DEV setting "Approval emails: Fail to send" (real failures arrive later, async)
// A failed email never undoes the decision (FR-23, API-09).
export function queueDecisionEmail({ request, appointmentId = null, templateKey, at }) {
    if (!request.requesterEmail || db.settings.emailOnDecision === false) return 'none'
    const failed = getEmailFault() === 'fail'
    db.notifications.push({
        id: `ntf-new-${db.notifications.length + 1}`,
        requestId: request.id,
        appointmentId,
        recipientEmail: request.requesterEmail,
        templateKey,
        status: failed ? 'failed' : 'queued',
        attemptCount: failed ? 1 : 0,
        lastError: failed ? 'Mailbox unavailable' : null,
        nextAttemptAt: failed ? plusMinutes(at, 15) : at,
        createdAt: at,
        sentAt: null,
    })
    return failed ? 'failed' : 'queued'
}