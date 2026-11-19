import { describe, expect, it } from 'vitest'
import { buildReportCsv, buildReportPdf, csvCell, reportFilename } from './reportFiles'

const meta = { generatedAt: '2026-10-26T10:15:00+08:00', generatedBy: 'Liza Ramos' }
const report = (appointments = []) => ({
    from: '2026-10-01',
    to: '2026-10-26',
    total: 65,
    statusCounts: { pending: 7, confirmed: 12, rejected: 3, cancelled: 2, completed: 41 },
    confirmedAppointments: appointments,
})
const appointment = (name, day = '26') => ({
    startAt: `2026-10-${day}T09:00:00+08:00`,
    endAt: `2026-10-${day}T10:00:00+08:00`,
    requesterName: name,
})
const asText = (bytes) => Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')

describe('csvCell', () => {
    it('quotes cells with commas, quotes or line breaks', () => {
        expect(csvCell('plain')).toBe('plain')
        expect(csvCell('Cruz, Juan')).toBe('"Cruz, Juan"')
        expect(csvCell('say "hi"')).toBe('"say ""hi"""')
        expect(csvCell('two\nlines')).toBe('"two\nlines"')
    })

    it('neutralizes anything a spreadsheet would run as a formula', () => {
        expect(csvCell('=SUM(1+1)')).toBe("'=SUM(1+1)")
        expect(csvCell('+1234')).toBe("'+1234")
        expect(csvCell('-2+3')).toBe("'-2+3")
        expect(csvCell('@cmd')).toBe("'@cmd")
        expect(csvCell('\t=1')).toBe("'\t=1")
        expect(csvCell('=HYPERLINK("http://x","y")')).toBe('"\'=HYPERLINK(""http://x"",""y"")"') // neutralized AND quoted
        expect(csvCell(7)).toBe('7')
        expect(csvCell(null)).toBe('')
    })
})

describe('buildReportCsv', () => {
    it('starts with a byte-order mark, uses Windows line endings, and has the title, status and appointment sections', () => {
        const csv = buildReportCsv(report([appointment('Barangay officials'), appointment('Rotary Club')]), meta)
        expect(csv.startsWith('\uFEFF')).toBe(true)
        const lines = csv.slice(1).split('\r\n')
        expect(lines[0]).toBe('Appointment report')
        expect(lines).toContain('From,2026-10-01')
        expect(lines).toContain('To,2026-10-26')
        expect(lines).toContain('Pending,7')
        expect(lines).toContain('Completed,41')
        expect(lines).toContain('Total,65')
        expect(lines).toContain('Date,Time,Requester')
        expect(lines).toContain('2026-10-26,9:00–10:00 AM,Barangay officials')
        expect(csv.endsWith('\r\n')).toBe(true)
    })

    it('shows zeros and no appointment rows for an empty report, never made-up numbers', () => {
        const csv = buildReportCsv({ ...report([]), total: 0, statusCounts: {} }, meta)
        expect(csv).toContain('Pending,0')
        expect(csv).toContain('Total,0')
        expect(csv.trimEnd().endsWith('Date,Time,Requester')).toBe(true)
    })

    it('makes a requester name that looks like a formula harmless', () => {
        const csv = buildReportCsv(report([appointment('=SUM(1+1)')]), meta)
        expect(csv).toContain("2026-10-26,9:00–10:00 AM,'=SUM(1+1)")
        expect(csv).not.toContain(',=SUM')
    })

    it('contains only the approved fields: no email, phone or purpose columns', () => {
        const csv = buildReportCsv(report([appointment('Maria Santos')]), meta)
        for (const word of ['Email', 'Phone', 'Purpose', 'Notes', '@']) expect(csv).not.toContain(word)
    })
})

describe('buildReportPdf', () => {
    it('is a well-formed PDF whose cross-reference table points at the objects', () => {
        const text = asText(buildReportPdf(report([appointment('Rotary Club')]), meta))
        expect(text.startsWith('%PDF-1.4')).toBe(true)
        expect(text.trimEnd().endsWith('%%EOF')).toBe(true)
        const xrefAt = Number(/startxref\n(\d+)\n/.exec(text)[1])
        expect(text.slice(xrefAt, xrefAt + 4)).toBe('xref')
        const entries = [...text.slice(xrefAt).matchAll(/^(\d{10}) 00000 n $/gm)].map((match) => Number(match[1]))
        expect(entries.length > 4).toBe(true)
        entries.forEach((offset, index) => expect(text.slice(offset, offset + `${index + 1} 0 obj`.length)).toBe(`${index + 1} 0 obj`))
    })

    it('contains the report text, with brackets and backslashes escaped', () => {
        const text = asText(buildReportPdf(report([appointment('Bgy. (North) \\ Council')]), meta))
        expect(text).toContain('Appointment report')
        expect(text).toContain('Total')
        expect(text).toContain('Bgy. \\(North\\) \\\\ Council')
        expect(text).toContain('Generated Oct 26, 10:15 AM by Liza Ramos')
    })

    it('keeps accented letters and shows unsupported characters as "?"', () => {
        const text = asText(buildReportPdf(report([appointment('Señor Ñandú 😀 日本')]), meta))
        expect(text).toContain('Se\xF1or \xD1and\xFA ? ??')
    })

    it('continues onto more pages for a long list, repeating the table header and numbering the pages', () => {
        const many = Array.from({ length: 120 }, (_, i) => appointment(`Requester ${i}`))
        const text = asText(buildReportPdf(report(many), meta))
        const pages = Number(/\/Count (\d+)/.exec(text)[1])
        expect(pages > 1).toBe(true)
        expect(text).toContain(`Page ${pages} of ${pages}`)
        expect([...text.matchAll(/\(Requester\) Tj/g)].length).toBe(pages) // header drawn once per page that has rows
    })

    it('says so when there are no confirmed appointments', () => {
        const text = asText(buildReportPdf({ ...report([]), total: 0, statusCounts: {} }, meta))
        expect(text).toContain('No confirmed appointments in this range.')
        expect(text).toContain('Confirmed appointments \\(0\\)')
    })
})

describe('reportFilename', () => {
    it('names the file after the range', () => {
        expect(reportFilename('2026-10-01', '2026-10-26', 'csv')).toBe('status-summary_2026-10-01_to_2026-10-26.csv')
    })
})
