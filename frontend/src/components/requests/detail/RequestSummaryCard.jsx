import Card from '../../ui/Card'
import { formatTimeRange, formatWeekdayDate, TIMEZONE } from '../../../utils/datetime'

// "Tue, Oct 27, 2026 · 9:30–10:30 AM (Asia/Manila)"
const formatWhen = (startIso, endIso) =>
    `${formatWeekdayDate(startIso)} · ${formatTimeRange(startIso, endIso)} (${TIMEZONE})`

    function Row({ label, children }) {
        return (
        <div>
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="mt-0.5 break-words whitespace-pre-line text-ink">{children}</dd>
        </div>
    )
}

// Purpose, preferred time, the confirmed time (when it differs) and contact details.
// React escapes everything it renders, so text typed into the public form is shown as text.
function RequestSummaryCard({ request }){
    const { appointment } = request
    const contact = [request.requesterEmail, request.requesterPhone].filter(Boolean)

    return (
        <Card title="Request">
        <dl className="flex flex-col gap-4">
            <Row label="Purpose">{request.purpose}</Row>
            <Row label="Preferred time">{formatWhen(request.preferredStartAt, request.preferredEndAt)}</Row>
            {appointment && (
            <Row label={appointment.status === 'cancelled' ? 'Cancelled appointment' : 'Confirmed time'}>
                {formatWhen(appointment.startAt, appointment.endAt)}
            </Row>
            )}
            <Row label="Contact">
            {contact.length > 0 ? contact.join(' · ') : 'No email or phone provided'}
            </Row>
            {request.encodedByName && <Row label="Encoded by">{request.encodedByName}</Row>}
        </dl>
        </Card>
    )
}
export default RequestSummaryCard