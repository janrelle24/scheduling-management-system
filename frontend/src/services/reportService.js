// Mirrors: GET /api/v1/reports/appointments           (reports.view)
//          GET /api/v1/reports/appointments/export    (reports.export, and the report must be viewable)
// The server checks the permission AND the range on every call (BR-010, UC-09). A refused attempt by
// a signed-in person is recorded as "Access denied". Only successful exports are audited.
import { db } from '../data/store'
import { getManilaDateStr } from '../utils/datetime'
import { PERMISSIONS } from '../utils/permissions'
import { REPORT_NAME, buildReportCsv, buildReportPdf, reportFilename } from '../utils/reportFiles'
import { validateReportRange } from '../utils/reportValidators'
import { ApiError } from './ApiError'
import { nowIso } from './decisions'
import { countByDisplayStatus } from './lookups'
import { inDateRange, mockApi } from './mockApi'
import { getExportFault } from './mockFaults'
import { requireAuthorized } from './security'

const FORMATS = {
    csv: { label: 'CSV', mimeType: 'text/csv;charset=utf-8' },
    pdf: { label: 'PDF', mimeType: 'application/pdf' },
}

function checkRange(from, to) {
    const fieldErrors = validateReportRange({ from, to })
    if (Object.keys(fieldErrors).length > 0) {
        throw new ApiError(422, 'validation_failed', 'Please correct the highlighted fields.', { fieldErrors })
    }
}

//  - statusCounts: requests counted by the date they were SUBMITTED, one status each
//  - confirmedAppointments: confirmed appointments STARTING inside the range
// Each appointment carries only what the report shows plus the reference (the screen does not use it).
function buildReport(from, to) {
    const inRange = db.requests.filter((request) => inDateRange(getManilaDateStr(request.createdAt), from, to))
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
    return { from, to, total: inRange.length, statusCounts: countByDisplayStatus(inRange), confirmedAppointments }
}

// params: { from, to } as 'YYYY-MM-DD'. Both are required (422 if missing, reversed, or longer than the
// limit). Returns { from, to, total, statusCounts, confirmedAppointments }.
export function getAppointmentReport({ from = '', to = '' } = {}) {
    return mockApi(() => {
        requireAuthorized(PERMISSIONS.REPORTS_VIEW, 'Reports')
        checkRange(from, to)
        return buildReport(from, to)
    })
}

// params: { from, to, format: 'csv' | 'pdf' } -> { filename, mimeType, data }
// data is the CSV text or the PDF bytes. The file holds only the fields the office approved (the
// counts; Date, Time and Requester of confirmed appointments). Errors: 401, 403, 422, 500 export_failed.
// A successful export is written to the audit log with the format, the range and the row count.
// A failed export is not, because nothing was exported.
export function exportAppointmentReport({ from = '', to = '', format } = {}) {
    return mockApi(() => {
        const actor = requireAuthorized(PERMISSIONS.REPORTS_EXPORT, 'Report export')
        requireAuthorized(PERMISSIONS.REPORTS_VIEW, 'Report export') // you cannot export what you may not see
        if (!FORMATS[format]) {
            throw new ApiError(422, 'validation_failed', 'Choose CSV or PDF.', { fieldErrors: { format: 'Choose CSV or PDF.' } })
        }
        checkRange(from, to)
        if (getExportFault() === 'fail') throw new ApiError(500, 'export_failed', 'The export failed.')
    
        const report = buildReport(from, to)
        const meta = { generatedAt: nowIso(), generatedBy: actor.fullName }
        const data = format === 'csv' ? buildReportCsv(report, meta) : buildReportPdf(report, meta)
    
        db.auditLogs.push({
            id: `aud-new-${db.auditLogs.length + 1}`,
            userId: actor.id,
            action: 'report.exported',
            entityType: 'report',
            entityId: null,
            details: { report: REPORT_NAME, format: FORMATS[format].label, from, to, rows: report.confirmedAppointments.length },
            ipAddress: null,
            createdAt: meta.generatedAt,
        })
        return { filename: reportFilename(from, to, format), mimeType: FORMATS[format].mimeType, data }
    })
}