import Badge from '../ui/Badge'
import ButtonLink from '../ui/ButtonLink'
import { Table, Td, Th } from '../ui/Table'
import TextLink from '../ui/TextLink'
import StatusBadge from '../StatusBadge'
import { useSession } from '../../hooks/useSession'
import { formatDateTime } from '../../utils/datetime'
import { PERMISSIONS } from '../../utils/permissions'
import { SOURCE_LABELS } from '../../utils/status'

function RowAction({ request, size, className }) {
    const { can } = useSession()
    const label = `${request.referenceNumber} from ${request.requesterName}`
    if (request.displayStatus === 'pending') {
        return (
            <ButtonLink to={`/requests/${request.id}`} variant="secondary" size={size} className={className} aria-label={`Review request ${label}`}>
            Review
            </ButtonLink>
        )
        }
        if (request.displayStatus === 'confirmed' && can(PERMISSIONS.APPOINTMENTS_RESCHEDULE)) {
        return (
            <ButtonLink to={`/requests/${request.id}`} variant="secondary" size={size} className={className} aria-label={`Reschedule request ${label}`}>
            Reschedule
            </ButtonLink>
        )
    }
    return null
}

function RequestsTable({ rows }) {
    return (
        <>
            <div className="hidden md:block">
            <Table label="Requests">
                <thead>
                <tr>
                    <Th>Ref</Th>
                    <Th>Requester</Th>
                    <Th>Preferred time</Th>
                    <Th>Source</Th>
                    <Th>Status</Th>
                    <Th>
                    <span className="sr-only">Action</span>
                    </Th>
                </tr>
                </thead>
                <tbody>
                {rows.map((request) => (
                    <tr key={request.id}>
                    <Td className="font-mono text-sm whitespace-nowrap">
                        <TextLink to={`/requests/${request.id}`}>{request.referenceNumber}</TextLink>
                    </Td>
                    <Td>{request.requesterName}</Td>
                    <Td className="whitespace-nowrap">{formatDateTime(request.preferredStartAt)}</Td>
                    <Td>
                        <Badge>{SOURCE_LABELS[request.source]}</Badge>
                    </Td>
                    <Td>
                        <StatusBadge status={request.displayStatus} />
                    </Td>
                    <Td>
                        <RowAction request={request} size="sm" />
                    </Td>
                    </tr>
                ))}
                </tbody>
            </Table>
            </div>
    
            <ul className="flex flex-col gap-3 p-4 md:hidden">
            {rows.map((request) => (
                <li key={request.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-ink">{request.requesterName}</p>
                    <StatusBadge status={request.displayStatus} />
                </div>
                <p className="mt-1 text-sm text-muted">
                    <TextLink to={`/requests/${request.id}`}>{request.referenceNumber}</TextLink> ·{' '}
                    {formatDateTime(request.preferredStartAt)} · {SOURCE_LABELS[request.source]}
                </p>
                <RowAction request={request} className="mt-3 w-full" />
                </li>
            ))}
            </ul>
        </>
    )
}

export default RequestsTable