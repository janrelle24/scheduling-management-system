import { formatDate, formatDateTime, formatTimeRange, getManilaDateStr, manilaIso, TIMEZONE } from './datetime'
import { buildPdf } from './pdfWriter'
import { STATUS_LABELS } from './status'

// What a status-summary report contains, as CSV and as PDF. Only the fields the office screen
// shows go in: the counts, and Date / Time / Requester of confirmed appointments (FR-29, UC-09).
// No contact details, purposes or notes. Which fields may be exported is to be confirmed with the office.
export const REPORT_NAME = 'Status summary'
const STATUS_ORDER = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed']
const BASIS_NOTE = 'Requests are counted by the date they were submitted; confirmed appointments are listed by their start date.'

export const reportFilename = (from, to, extension) => `status-summary_${from}_to_${to}.${extension}`

const longDate = (date) => formatDate(manilaIso(date, '12:00'))

// One CSV cell. Quotes when needed. A cell that starts with = + - @ (or a tab / return) would be
// run as a FORMULA by Excel and similar programs, and requester names come from a public form,
// so those get a leading apostrophe and show as plain text.
export function csvCell(value) {
    let text = String(value ?? '')
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// report: { from, to, total, statusCounts, confirmedAppointments }, meta: { generatedAt, generatedBy }
export function buildReportCsv(report, meta) {
    const rows = [
        ['Appointment report'],
        [REPORT_NAME],
        ['From', report.from],
        ['To', report.to],
        ['Time zone', TIMEZONE],
        ['Generated', `${formatDateTime(meta.generatedAt)} by ${meta.generatedBy}`],
        [BASIS_NOTE],
        [],
        ['Appointments by status'],
        ['Status', 'Requests'],
        ...STATUS_ORDER.map((status) => [STATUS_LABELS[status], report.statusCounts[status] ?? 0]),
        ['Total', report.total],
        [],
        ['Confirmed appointments'],
        ['Date', 'Time', 'Requester'],
        ...report.confirmedAppointments.map((row) => [
            getManilaDateStr(row.startAt),
            formatTimeRange(row.startAt, row.endAt),
            row.requesterName,
        ]),
    ]
    // The byte-order mark lets Excel read accents (UTF-8); Windows line endings suit spreadsheets.
    return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
}

export function buildReportPdf(report, meta) {
    const appointments = report.confirmedAppointments
    return buildPdf([
        { type: 'title', text: 'Appointment report' },
        { type: 'heading', text: REPORT_NAME },
        { type: 'text', text: `Range: ${longDate(report.from)} to ${longDate(report.to)} (${TIMEZONE})` },
        { type: 'text', text: `Generated ${formatDateTime(meta.generatedAt)} by ${meta.generatedBy}` },
        { type: 'text', text: BASIS_NOTE, muted: true },
        { type: 'space', size: 10 },
        { type: 'heading', text: 'Appointments by status' },
        {
            type: 'table',
            columns: [{ header: 'Status', width: 0.6 }, { header: 'Requests', width: 0.4 }],
            rows: [
            ...STATUS_ORDER.map((status) => [STATUS_LABELS[status], String(report.statusCounts[status] ?? 0)]),
            ['Total', String(report.total)],
            ],
            boldLastRow: true,
        },
        { type: 'space', size: 10 },
        { type: 'heading', text: `Confirmed appointments (${appointments.length})` },
        appointments.length === 0
            ? { type: 'text', text: 'No confirmed appointments in this range.' }
            : {
                type: 'table',
                columns: [{ header: 'Date', width: 0.22 }, { header: 'Time', width: 0.28 }, { header: 'Requester', width: 0.5 }],
                rows: appointments.map((row) => [
                    longDate(getManilaDateStr(row.startAt)),
                    formatTimeRange(row.startAt, row.endAt),
                    row.requesterName,
                ]),
            },
    ])
}