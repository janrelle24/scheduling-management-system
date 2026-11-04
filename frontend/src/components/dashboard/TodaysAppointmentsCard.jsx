import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import ErrorState from '../ui/ErrorState'
import Spinner from '../ui/Spinner'
import StatusBadge from '../StatusBadge'
import { useAsyncData } from '../../hooks/useAsyncData'
import { listAppointments } from '../../services/appointmentService'
import { getNow } from '../../utils/clock'
import { formatTimeRange, getManilaDateStr } from '../../utils/datetime'

async function loadToday() {
    const today = getManilaDateStr(getNow())
    const appointments = await listAppointments({ from: today, to: today })
    return appointments.filter((appointment) => appointment.status !== 'cancelled')
}

function TodaysAppointmentsCard(){
    const { status, data, reload } = useAsyncData(loadToday)

    return (
        <Card flush title="Today's appointments">
            {status === 'loading' && <Spinner label="Loading appointments…" />}
            {status === 'error' && (
                <div className="p-4">
                <ErrorState message="We couldn't load today's appointments." onRetry={reload} />
                </div>
            )}
            {status === 'success' && data.length === 0 && <EmptyState message="No appointments today." />}
            {status === 'success' && data.length > 0 && (
                <ul>
                {data.map((appointment) => (
                    <li
                    key={appointment.id}
                    className="flex flex-col gap-1 border-t border-border px-5 py-3 first:border-t-0 sm:flex-row sm:gap-4"
                    >
                    <p className="font-mono text-sm text-muted sm:w-36 sm:shrink-0">
                        {formatTimeRange(appointment.startAt, appointment.endAt)}
                    </p>
                    <div className="flex flex-col items-start gap-1">
                        <p className="font-semibold text-ink">{appointment.purpose}</p>
                        <StatusBadge status={appointment.status} />
                    </div>
                    </li>
                ))}
                </ul>
            )}
        </Card>
    )
}
export default TodaysAppointmentsCard