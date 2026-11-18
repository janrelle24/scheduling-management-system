import { getNow } from './clock'
import { formatDateTime } from './datetime'

// The "Next retry" column: a sent email has none ("—"), a queued email that is due says "Now",
// anything else shows its time.
export function nextRetryText(row, now = getNow()) {
    if (row.status === 'sent' || !row.nextAttemptAt) return '—'
    if (row.status === 'queued' && new Date(row.nextAttemptAt) <= now) return 'Now'
    return formatDateTime(row.nextAttemptAt)
}

// The banner above the table. Wording follows the design, widened because the failed email may be
// an acknowledgement (no appointment yet), not only a decision.
export function failedBanner(failedCount, errors) {
    if (failedCount === 0) return null
    const what = failedCount === 1 ? '1 email failed' : `${failedCount} emails failed`
    const why = errors.length > 0 ? `: ${errors.map((error) => `“${error}.”`).join(' ')}` : '.'
    return `${what}${why} The request or appointment keeps its status; delivery is retried automatically.`
}
