import { describe, expect, it } from 'vitest'
import { db } from '../data/store'
import { listAuditLogs } from './auditService'
import { setExportFault } from './mockFaults'
import { setMockActor } from './mockSession'
import { exportAppointmentReport, getAppointmentReport } from './reportService'

// Liza can view AND export reports. Elena can only view them. Marco can do neither.
const as = (id) => setMockActor(db.users.find((u) => u.id === id))
const range = { from: '2026-10-01', to: '2026-10-26' } // the range in the design
const audit = (action) => db.auditLogs.filter((row) => row.action === action)
const rejection = async (promise) => {
    try {
        await promise
    } catch (error) {
        return error
    }
    return null
}
const asText = (bytes) => Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')

describe('who may view a report', () => {
    it('refuses nobody-signed-in (401) and a user without reports.view (403, recorded)', async () => {
        setMockActor(null)
        expect((await rejection(getAppointmentReport(range))).status).toBe(401)
        as('user-marco')
        const before = audit('security.access_denied').length
        expect((await rejection(getAppointmentReport(range))).status).toBe(403)
        const added = audit('security.access_denied').slice(before)
        expect(added[0].details).toEqual({ attempted: 'Reports', result: 'failed' })
    })
})

describe('getAppointmentReport', () => {
    it('counts the design range: 7 pending, 12 confirmed, 3 rejected, 2 cancelled, 41 completed', async () => {
        as('user-liza')
        const report = await getAppointmentReport(range)
        expect(report.statusCounts).toEqual({ pending: 7, confirmed: 12, rejected: 3, cancelled: 2, completed: 41 })
        expect(report.total).toBe(65)
        expect(Object.values(report.statusCounts).reduce((a, b) => a + b, 0)).toBe(report.total)
    })

    it('lists the confirmed appointments starting in the range, earliest first', async () => {
        as('user-liza')
        const { confirmedAppointments } = await getAppointmentReport(range)
        expect(confirmedAppointments.map((a) => a.requesterName)).toEqual(['Barangay officials', 'Rotary Club', 'City Budget Office'])
        expect(confirmedAppointments.map((a) => a.startAt.slice(11, 16))).toEqual(['09:00', '11:00', '14:00'])
        const starts = confirmedAppointments.map((a) => a.startAt)
        expect(starts).toEqual([...starts].sort())
        expect(confirmedAppointments.every((a) => a.startAt.startsWith('2026-10-26'))).toBe(true)
    })

    it('narrows to one day, and gives zeros and no rows for a range with no records (never made-up totals)', async () => {
        as('user-liza')
        const quiet = await getAppointmentReport({ from: '2027-03-01', to: '2027-03-07' })
        expect(quiet.total).toBe(0)
        expect(quiet.statusCounts).toEqual({ pending: 0, confirmed: 0, rejected: 0, cancelled: 0, completed: 0 })
        expect(quiet.confirmedAppointments).toEqual([])
        const oneDay = await getAppointmentReport({ from: '2026-10-26', to: '2026-10-26' })
        expect(oneDay.confirmedAppointments.length).toBe(3)
    })

    it('refuses a missing, reversed or too long range (422) with the field message', async () => {
        as('user-liza')
        expect((await rejection(getAppointmentReport({ from: '', to: '' }))).details.fieldErrors).toEqual({ from: 'Choose a start date.', to: 'Choose an end date.' })
        expect((await rejection(getAppointmentReport({ from: '2026-10-27', to: '2026-10-26' }))).details.fieldErrors.to).toBe('The end date must be on or after the start date.')
        expect((await rejection(getAppointmentReport({ from: '2024-01-01', to: '2026-10-26' }))).details.fieldErrors.to).toBe('Choose a range of at most 366 days.')
    })
})

describe('who may export (UC-09)', () => {
    it('refuses a user who can view but not export (403, recorded) and writes no audit entry or file', async () => {
        as('user-elena')
        expect((await getAppointmentReport(range)).total).toBe(65) // Elena may view
        const exported = audit('report.exported').length
        const denied = audit('security.access_denied').length
        const error = await rejection(exportAppointmentReport({ ...range, format: 'csv' }))
        expect(error.status).toBe(403)
        expect(error.details).toBe(null) // no file, no data
        expect(audit('report.exported').length).toBe(exported)
        expect(audit('security.access_denied').slice(denied)[0].details).toEqual({ attempted: 'Report export', result: 'failed' })
    })

    it('refuses someone who can export but not view the report', async () => {
        const liza = db.users.find((u) => u.id === 'user-liza')
        const kept = liza.permissions
        liza.permissions = ['reports.export']
        as('user-liza')
        expect((await rejection(exportAppointmentReport({ ...range, format: 'csv' }))).status).toBe(403)
        liza.permissions = kept
    })

    it('refuses nobody-signed-in (401), an unknown format and a bad range (422)', async () => {
        setMockActor(null)
        expect((await rejection(exportAppointmentReport({ ...range, format: 'csv' }))).status).toBe(401)
        as('user-liza')
        expect((await rejection(exportAppointmentReport({ ...range, format: 'xlsx' }))).details.fieldErrors.format).toBe('Choose CSV or PDF.')
        expect((await rejection(exportAppointmentReport({ from: '2026-10-27', to: '2026-10-26', format: 'csv' }))).status).toBe(422)
    })
})

describe('exporting', () => {
    it('exports a CSV that matches the preview, and records it in the audit log', async () => {
        as('user-liza')
        const before = audit('report.exported').length
        const file = await exportAppointmentReport({ ...range, format: 'csv' })
        expect(file.filename).toBe('status-summary_2026-10-01_to_2026-10-26.csv')
        expect(file.mimeType).toBe('text/csv;charset=utf-8')
        expect(file.data).toContain('Pending,7')
        expect(file.data).toContain('Completed,41')
        expect(file.data).toContain('Total,65')
        expect(file.data).toContain('2026-10-26,9:00–10:00 AM,Barangay officials')
        expect(file.data).toContain('Generated,"Oct 26, 10:15 AM by Liza Ramos"') // quoted: the text contains a comma

        const entry = audit('report.exported').slice(before)[0]
        expect(entry).toMatchObject({ userId: 'user-liza', details: { report: 'Status summary', format: 'CSV', from: '2026-10-01', to: '2026-10-26', rows: 3 } })
        expect(JSON.stringify(entry)).not.toContain('Barangay') // the entry never copies report content
        setMockActor(db.users.find((u) => u.id === 'user-elena'))
        const shown = (await listAuditLogs({ action: 'report.exported' })).items[0]
        expect(shown).toMatchObject({ actorName: 'Liza Ramos', actionLabel: 'Exported report', recordLabel: 'Status summary · CSV', result: 'success' })
    })

    it('exports a PDF with the same numbers', async () => {
        as('user-liza')
        const file = await exportAppointmentReport({ ...range, format: 'pdf' })
        expect(file.filename).toBe('status-summary_2026-10-01_to_2026-10-26.pdf')
        expect(file.mimeType).toBe('application/pdf')
        expect(file.data instanceof Uint8Array).toBe(true)
        const text = asText(file.data)
        expect(text.startsWith('%PDF-')).toBe(true)
        expect(text).toContain('Rotary Club')
        expect(text).toContain('Total')
        expect(audit('report.exported').at(-1).details.format).toBe('PDF')
    })

    it('exports an empty range as a file of zeros', async () => {
        as('user-liza')
        const file = await exportAppointmentReport({ from: '2027-03-01', to: '2027-03-07', format: 'csv' })
        expect(file.data).toContain('Total,0')
        expect(audit('report.exported').at(-1).details.rows).toBe(0)
    })

    it('contains no contact details, purposes or notes, whatever is stored', async () => {
        as('user-liza')
        const confirmed = db.requests.find((r) => r.status === 'confirmed')
        const secrets = [confirmed.requesterEmail, confirmed.requesterPhone, confirmed.purpose].filter(Boolean)
        expect(secrets.length > 0).toBe(true)
        for (const format of ['csv', 'pdf']) {
        const file = await exportAppointmentReport({ from: '2026-01-01', to: '2026-12-31', format })
        const text = typeof file.data === 'string' ? file.data : asText(file.data)
        for (const secret of secrets) expect(text).not.toContain(secret)
        }
    })

    it('makes a requester name that looks like a formula harmless in the CSV', async () => {
        as('user-liza')
        const request = db.requests.find((r) => r.requesterName === 'Rotary Club')
        const kept = request.requesterName
        request.requesterName = '=SUM(1+1)'
        const file = await exportAppointmentReport({ ...range, format: 'csv' })
        request.requesterName = kept
        expect(file.data).toContain("11:00–11:30 AM,'=SUM(1+1)")
        expect(file.data).not.toContain(',=SUM')
    })

    it('reports a failure and writes NO audit entry, then works once the fault is gone', async () => {
        as('user-liza')
        const before = audit('report.exported').length
        setExportFault('fail')
        const error = await rejection(exportAppointmentReport({ ...range, format: 'pdf' }))
        expect(error).toMatchObject({ status: 500, code: 'export_failed' })
        expect(audit('report.exported').length).toBe(before)
        setExportFault('none')
        expect((await exportAppointmentReport({ ...range, format: 'pdf' })).filename.endsWith('.pdf')).toBe(true)
        expect(audit('report.exported').length).toBe(before + 1)
    })
})
