import { Link } from 'react-router-dom'
import { cx } from '../../utils/classNames'
import { eventTitle, formatCompactTime } from '../../utils/calendarMath'
import { formatShortDate, formatTime, formatTimeRange } from '../../utils/datetime'

// Confirmed = solid green (it blocks the time). Pending = DASHED orange with a white fill:
// it is only a request, never a booking. Completed = teal.
const LOOKS = {
    confirmed: 'border border-confirmed-border bg-confirmed-bg text-confirmed-fg',
    completed: 'border border-completed-border bg-completed-bg text-completed-fg',
    pending: 'border-2 border-dashed border-pending-border bg-surface text-pending-fg',
}

// The month chips are small, so their borders are thinner.
const CHIP_LOOKS = { ...LOOKS, pending: 'border border-dashed border-pending-border bg-surface text-pending-fg' }

// Colour is never the only signal: screen readers hear the status in words.
const statusWords = (event) => (event.kind === 'request' ? 'pending request, not a booking' : event.status)

// One event, always a link to its request page.
//   layout="block"  fills its box on the hour grid (day and week views)
//   layout="chip"   one short line in a month cell
//   layout="agenda" a card in the phone week list
function CalendarEvent({ event, layout = 'block' }) {
    const kind = event.kind === 'request' ? 'pending' : event.status
    const look = LOOKS[kind]
    const label = `${eventTitle(event)}, ${statusWords(event)}, ${formatShortDate(event.startAt)}, ${formatTimeRange(event.startAt, event.endAt)}`

    if (layout === 'chip') {
        return (
            <Link
            to={`/requests/${event.requestId}`}
            aria-label={label}
            className={cx('block truncate rounded px-1.5 py-0.5 text-xs font-medium', CHIP_LOOKS[kind])}
            >
            {formatCompactTime(event.startAt)} {eventTitle(event, { compact: true })}
            </Link>
        )
    }

    if (layout === 'agenda') {
        return (
            <Link to={`/requests/${event.requestId}`} aria-label={label} className={cx('block rounded-lg px-3 py-2', look)}>
            <span className="block text-sm">{formatTimeRange(event.startAt, event.endAt)}</span>
            <span className="block font-semibold">{eventTitle(event)}</span>
            </Link>
        )
    }
    return (
        <Link
            to={`/requests/${event.requestId}`}
            aria-label={label}
            className={cx('block h-full overflow-hidden rounded-md px-2 py-1 text-sm leading-tight', look)}
            >
            <span className="block truncate font-semibold">{eventTitle(event)}</span>
            <span className="block truncate">{formatTime(event.startAt)}</span>
        </Link>
    )
}

export default CalendarEvent