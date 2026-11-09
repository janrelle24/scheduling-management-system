import ButtonLink from '../ui/ButtonLink'
import Card from '../ui/Card'
import { summarizeDay } from '../../utils/calendarMath'

// Counts for the day shown in the Day view, with a shortcut to encode a walk-in.
export default function DaySummaryCard({ events, canCreate }) {
    const { confirmed, completed, pending } = summarizeDay(events)

    return (
        <Card title="Day summary">
            <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
                <span className="rounded-md bg-confirmed-bg px-2 py-0.5 text-sm font-semibold text-confirmed-fg">
                {confirmed} confirmed
                </span>
                {completed > 0 && (
                <span className="rounded-md bg-completed-bg px-2 py-0.5 text-sm font-semibold text-completed-fg">
                    {completed} completed
                </span>
                )}
                <span className="rounded-md bg-pending-bg px-2 py-0.5 text-sm font-semibold text-pending-fg">
                {pending} pending {pending === 1 ? 'request' : 'requests'}
                </span>
            </div>
            {events.length === 0 && <p className="text-muted">Nothing is scheduled for this day.</p>}
            <p className="text-muted">Pending requests do not block time. Open the request to approve.</p>
            {canCreate && (
                <ButtonLink to="/requests/new" variant="secondary" className="w-full">
                + New In-Person Request
                </ButtonLink>
            )}
            </div>
        </Card>
    )
}