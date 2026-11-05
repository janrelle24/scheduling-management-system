// Mirrors: GET /api/v1/admin/email-notifications
import { db } from '../data/store'
import { mockApi, paginate } from './mockApi'

// params: { status, page, pageSize }. Newest first.
export function listEmailNotifications({ status = '', page = 1, pageSize = 10 } = {}) {
    return mockApi(() => {
        const rows = db.notifications
            .filter((row) => !status || row.status === status)
            .map((row) => {
                const request = db.requests.find((r) => r.id === row.requestId)
                return { ...row, referenceNumber: request?.referenceNumber ?? null }
            })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        return paginate(rows, page, pageSize)
    })
}
