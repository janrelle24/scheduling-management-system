// Mirrors: GET /api/v1/reports/appointments  (the CSV/PDF export comes with the Reports feature)
import { db } from '../data/store'
import { getManilaDateStr } from '../utils/datetime'
import { countByDisplayStatus } from './lookups'
import { inDateRange, mockApi } from './mockApi'

// params: { from, to } as 'YYYY-MM-DD' (optional).
//  - statusCounts: requests counted by the date they were SUBMITTED, one status each
//    (the dashboard calls this with no dates to get overall counts)
//  - confirmedAppointments: confirmed appointments STARTING inside the range
export function getAppointmentReport({ from = '', to = '' } = {}) {
    return mockApi(() => {
        const inRange = db.requests.filter((request) =>
            inDateRange(getManilaDateStr(request.createdAt), from, to),
        )
        const statusCounts = countByDisplayStatus(inRange)
        const total = inRange.length

        const confirmedAppointments = db.appointments
            .filter((row) => row.status === 'confirmed')
            .filter((row) => inDateRange(getManilaDateStr(row.startAt), from, to))
            .map((row) => {
                const request = db.requests.find((r) => r.id === row.requestId)
                return {
                id: row.id,
                startAt: row.startAt,
                endAt: row.endAt,
                requesterName: request.requesterName,
                referenceNumber: request.referenceNumber,
                }
        })
        .sort((a, b) => a.startAt.localeCompare(b.startAt))

        return { from, to, total, statusCounts, confirmedAppointments }
    })
}
