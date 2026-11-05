import Badge from '../ui/Badge'
import ButtonLink from '../ui/ButtonLink'
import { Table, Td, Th } from '../ui/Table'
import TextLink from '../ui/TextLink'
import StatusBadge from '../StatusBadge'
import { useSession } from '../../hooks/useSession'
import { formatShortDate, formatTimeRange } from '../../utils/datetime'
import { PERMISSIONS } from '../../utils/permissions'
import { SOURCE_LABELS } from '../../utils/status'

// "Oct 27, 9:00–10:00 AM"
const when = (appointment) =>
    `${formatShortDate(appointment.startAt)}, ${formatTimeRange(appointment.startAt, appointment.endAt)}`

  // Reschedule opens the request page until its dialog is built (a later feature).
function RowAction({ appointment, size, className }) {
    const { can } = useSession()
    if (appointment.status !== 'confirmed' || !can(PERMISSIONS.APPOINTMENTS_RESCHEDULE)) return null
    return (
        <ButtonLink
            to={`/requests/${appointment.requestId}`}
            variant="secondary"
            size={size}
            className={className}
            aria-label={`Reschedule appointment ${appointment.referenceNumber} for ${appointment.requesterName}`}
        >
            Reschedule
        </ButtonLink>
    )
}

function AppointmentsTable({ rows }){
    return (
        <>
            <div className="hidden md:block">
                <Table label="Appointments">
                <thead>
                    <tr>
                    <Th>Ref</Th>
                    <Th>Requester</Th>
                    <Th>Appointment time</Th>
                    <Th>Source</Th>
                    <Th>Status</Th>
                    <Th>
                        <span className="sr-only">Action</span>
                    </Th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((appointment) => (
                    <tr key={appointment.id}>
                        <Td className="font-mono text-sm whitespace-nowrap">
                        <TextLink to={`/requests/${appointment.requestId}`}>{appointment.referenceNumber}</TextLink>
                        </Td>
                        <Td>{appointment.requesterName}</Td>
                        <Td className="whitespace-nowrap">{when(appointment)}</Td>
                        <Td>
                        <Badge>{SOURCE_LABELS[appointment.source]}</Badge>
                        </Td>
                        <Td>
                        <StatusBadge status={appointment.status} />
                        </Td>
                        <Td>
                        <RowAction appointment={appointment} size="sm" />
                        </Td>
                    </tr>
                    ))}
                </tbody>
                </Table>
            </div>
    
            <ul className="flex flex-col gap-3 p-4 md:hidden">
                {rows.map((appointment) => (
                <li key={appointment.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-ink">{appointment.requesterName}</p>
                    <StatusBadge status={appointment.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                    <TextLink to={`/requests/${appointment.requestId}`}>{appointment.referenceNumber}</TextLink> ·{' '}
                    {when(appointment)} · {SOURCE_LABELS[appointment.source]}
                    </p>
                    <RowAction appointment={appointment} className="mt-3 w-full" />
                </li>
                ))}
            </ul>
        </>
    )
}
export default AppointmentsTable