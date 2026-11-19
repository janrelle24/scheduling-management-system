// A tiny PDF writer for simple reports: titles, paragraphs and tables, in the built-in Helvetica
// fonts, on A4 pages. No dependency. It exists so the MOCK export produces a real, readable PDF;
// the real backend will generate PDFs with a proper library.
//
//   buildPdf([
//     { type: 'title', text: 'Appointment report' },
//     { type: 'heading', text: 'Status summary' },
//     { type: 'text', text: 'Some words', muted: true },
//     { type: 'space', size: 12 },
//     { type: 'table', columns: [{ header: 'Status', width: 0.6 }, { header: 'Requests', width: 0.4 }], rows: [['Pending', '7']] },
//   ]) -> Uint8Array
//
// Text is limited to what the PDF "WinAnsi" encoding can show (Latin letters with accents such as ñ,
// and common punctuation). Anything else is shown as "?".

const PAGE = { width: 595.28, height: 841.89, margin: 50 }
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2
const FOOTER_SPACE = 30
const AVERAGE_CHAR_WIDTH = 0.55 // of the font size: a cautious estimate, used only to wrap lines

// Characters outside Latin-1 that WinAnsi does have, as the byte they use.
const WIN_ANSI_EXTRA = {
    '–': '\x96', '—': '\x97', '‘': '\x91', '’': '\x92', '“': '\x93', '”': '\x94', '•': '\x95', '…': '\x85',
}

// One string of "byte characters" (each char code is 0 to 255) that is safe inside a PDF string.
function encodeText(text) {
    let out = ''
    for (const ch of String(text ?? '').replace(/\s+/g, ' ')) {
        const code = ch.codePointAt(0)
        if (WIN_ANSI_EXTRA[ch]) out += WIN_ANSI_EXTRA[ch]
        else if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) out += ch
        else out += '?'
    }
    return out.replace(/([\\()])/g, '\\$1')
}

// Breaks text into lines that fit `width` points (by estimate). A very long word is split.
function wrap(text, width, size) {
    const perLine = Math.max(1, Math.floor(width / (size * AVERAGE_CHAR_WIDTH)))
    const lines = []
    let line = ''
    for (const word of String(text ?? '').split(/\s+/).filter(Boolean)) {
        let rest = word
        while (rest.length > perLine) {
            if (line) {
            lines.push(line)
            line = ''
            }
            lines.push(rest.slice(0, perLine))
            rest = rest.slice(perLine)
        }
        if (!line) line = rest
        else if ((line + ' ' + rest).length <= perLine) line += ` ${rest}`
        else {
            lines.push(line)
            line = rest
        }
    }
    if (line || lines.length === 0) lines.push(line)
    return lines
}

const num = (value) => value.toFixed(2)

export function buildPdf(blocks) {
    const pages = [[]] // each page: drawing operators
    let y = PAGE.height - PAGE.margin

    const ops = () => pages[pages.length - 1]
    const newPage = () => {
        pages.push([])
        y = PAGE.height - PAGE.margin
    }
    const ensure = (height) => {
        if (y - height < PAGE.margin + FOOTER_SPACE) newPage()
    }
    const draw = (text, x, baseline, { bold = false, size = 10, gray = 0 } = {}) =>
        ops().push(`BT ${num(gray)} g /${bold ? 'F2' : 'F1'} ${size} Tf ${num(x)} ${num(baseline)} Td (${encodeText(text)}) Tj ET`)
    const rule = (atY, gray = 0.8) =>
        ops().push(`${num(gray)} G 0.5 w ${num(PAGE.margin)} ${num(atY)} m ${num(PAGE.width - PAGE.margin)} ${num(atY)} l S`)

    for (const block of blocks) {
        if (block.type === 'space') {
        y -= block.size ?? 10
        } else if (block.type === 'title' || block.type === 'heading' || block.type === 'text') {
        const style =
            block.type === 'title' ? { size: 18, bold: true, gap: 8 } : block.type === 'heading' ? { size: 13, bold: true, gap: 6 } : { size: 10, bold: false, gap: 3 }
        const lineHeight = style.size * 1.35
        for (const line of wrap(block.text, CONTENT_WIDTH, style.size)) {
            ensure(lineHeight)
            y -= lineHeight
            draw(line, PAGE.margin, y, { size: style.size, bold: style.bold, gray: block.muted ? 0.4 : 0 })
        }
        y -= style.gap
        } else if (block.type === 'table') {
        const widths = block.columns.map((column) => column.width * CONTENT_WIDTH)
        const offsets = widths.map((_, index) => PAGE.margin + widths.slice(0, index).reduce((sum, w) => sum + w, 0))
        const drawHeader = () => {
            ensure(30)
            y -= 14
            block.columns.forEach((column, index) => draw(column.header, offsets[index] + 2, y, { bold: true }))
            y -= 5
            rule(y, 0.3)
        }
        drawHeader()
        for (const row of block.rows) {
            const cells = row.map((cell, index) => wrap(cell, widths[index] - 6, 10))
            const rowHeight = Math.max(...cells.map((lines) => lines.length)) * 13 + 5
            if (y - rowHeight < PAGE.margin + FOOTER_SPACE) {
            newPage()
            drawHeader() // the header repeats on every page
            }
            cells.forEach((lines, index) =>
            lines.forEach((line, lineIndex) => draw(line, offsets[index] + 2, y - 13 - lineIndex * 13, { bold: block.boldLastRow && row === block.rows[block.rows.length - 1] })),
            )
            y -= rowHeight
            rule(y)
        }
        y -= 6
        }
    }
    
    // Page numbers, now that the count is known.
    pages.forEach((page, index) => {
        page.push(
        `BT 0.4 g /F1 9 Tf ${num(PAGE.width - PAGE.margin - 60)} ${num(PAGE.margin - 10)} Td (Page ${index + 1} of ${pages.length}) Tj ET`,
        )
    })

    // ---- assemble the file ----
    const objects = [] // objects[i] is object number i + 1
    const pageObjectNumber = (index) => 5 + index * 2
    objects.push('<< /Type /Catalog /Pages 2 0 R >>')
    objects.push(`<< /Type /Pages /Kids [${pages.map((_, index) => `${pageObjectNumber(index)} 0 R`).join(' ')}] /Count ${pages.length} >>`)
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
    pages.forEach((page, index) => {
        const content = page.join('\n')
        objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(PAGE.width)} ${num(PAGE.height)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageObjectNumber(index) + 1} 0 R >>`,
        )
        objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)
    })

    let file = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
    const offsets = []
    objects.forEach((body, index) => {
        offsets.push(file.length)
        file += `${index + 1} 0 obj\n${body}\nendobj\n`
    })
    const xrefAt = file.length
    file += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    file += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
    file += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`

    const bytes = new Uint8Array(file.length)
    for (let i = 0; i < file.length; i += 1) bytes[i] = file.charCodeAt(i) & 0xff
    return bytes

}