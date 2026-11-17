// Server-side permission check that also records a refused attempt (UC-07). Used by the admin
// services (Staff Accounts, Scheduling Settings). Not imported by any screen.
import { db } from '../data/store'
import { nowIso } from './decisions'
import { getMockActor, requireActor } from './mockSession'

// Like requireActor, but a signed-in person who is refused (403) is written to the audit log
// as a security event ("Access denied") before the error is thrown. `attempted` says what they tried.
export function requireAuthorized(permission, attempted) {
    try {
        return requireActor(permission)
    } catch (error) {
        const actor = getMockActor()
        if (error.status === 403 && actor) {
        db.auditLogs.push({
            id: `aud-new-${db.auditLogs.length + 1}`,
            userId: actor.id,
            action: 'security.access_denied',
            entityType: 'security',
            entityId: null,
            details: { attempted, result: 'failed' },
            ipAddress: null,
            createdAt: nowIso(),
        })
        }
        throw error
    }
}
