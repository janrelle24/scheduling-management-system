// Hands a file to the browser as a download. `data` is a string (CSV) or bytes (PDF).
// The real app does the same with the file the export endpoint returns.
export function downloadFile({ filename, mimeType, data }) {
    const url = URL.createObjectURL(new Blob([data], { type: mimeType }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0) // free the memory once the download has started
}
