import Card from '../../ui/Card'
import { formatDateTime } from '../../../utils/datetime'
import { buildTimeline } from '../../../utils/requestTimeline'

// The request's story, oldest first. The list is built by buildTimeline (utils/requestTimeline.js).
function StatusHistoryCard({ request }){
    const events = buildTimeline(request)

    return (
        <Card title="Status history">
        {events.length === 0 ? (
            <p className="text-muted">No history recorded yet.</p>
        ) : (
            <ol className="flex flex-col gap-4">
            {events.map((event) => (
                <li key={event.id} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />
                <div className="min-w-0">
                    <p className="font-semibold text-ink">{event.title}</p>
                    <p className="text-sm text-muted">
                    {formatDateTime(event.at)}
                    {event.actor ? ` · ${event.actor}` : ''}
                    </p>
                    {event.reason && <p className="mt-1 break-words text-sm text-ink">Reason: {event.reason}</p>}
                </div>
                </li>
            ))}
            </ol>
        )}
        </Card>
    )
}
export default StatusHistoryCard