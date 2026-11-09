// PROPOSED endpoint (not in Phase 2): GET /api/v1/scheduling-policy
// A tiny read-only view of the office rules every signed-in staff member needs, because the
// full scheduling settings need settings.manage. The reject / cancel dialogs use it to know
// whether a reason is required. The server enforces the rule either way.
// default. The server enforces the rules either way. Returns { requireReason, defaultDurationMinutes }.
import { db } from '../data/store'
import { mockApi } from './mockApi'
import { requireActor } from './mockSession'

export function getSchedulingPolicy() {
    return mockApi(() => {
        requireActor()
        return { 
            requireReason: db.settings.requireReasonOnRejectCancel,
            defaultDurationMinutes: db.settings.defaultDurationMinutes,
        }
    })
}
