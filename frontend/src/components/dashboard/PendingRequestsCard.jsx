import Badge from '../ui/Badge'
import ButtonLink from '../ui/ButtonLink'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import ErrorState from '../ui/ErrorState'
import Spinner from '../ui/Spinner'
import { Table, Td, Th } from '../ui/Table'
import TextLink from '../ui/TextLink'
import StatusBadge from '../StatusBadge'
import { useAsyncData } from '../../hooks/useAsyncData'
import { listRequests } from '../../services/requestService'
import { getNow } from '../../utils/clock'
import { formatAge, formatDateTime } from '../../utils/datetime'
import { SOURCE_LABELS } from '../../utils/status'

const loadPending = () => listRequests({ status: 'pending', pageSize: 4 })

function PendingRequestsCard(){
    const { status, data, reload } = useAsyncData(loadPending)
    const now = getNow()
    const rows = data?.items ?? []

    return (
        <Card
            flush
            title={
                <>
                <span className="md:hidden">Needs your decision</span>
                <span className="hidden md:inline">Pending requests — needs your decision</span>
                </>
            }
            action={<TextLink to="/requests?status=pending">View all</TextLink>}
        >
            {status === 'loading' && <Spinner label="Loading requests…" />}
            {status === 'error' && (
                <div className="p-4">
                <ErrorState message="We couldn't load the pending requests." onRetry={reload} />
                </div>
            )}
            {status === 'success' && rows.length === 0 && <EmptyState message="No pending requests." />}
        
            {status === 'success' && rows.length > 0 && (
                <>
                <div className="hidden md:block">
                    <Table compact label="Pending requests that need a decision">
                    <thead>
                        <tr>
                        <Th>Ref</Th>
                        <Th>Requester</Th>
                        <Th>Preferred time</Th>
                        <Th>Source</Th>
                        <Th>Age</Th>
                        <Th>
                            <span className="sr-only">Action</span>
                        </Th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((request) => (
                        <tr key={request.id}>
                            <Td className="font-mono text-xs whitespace-nowrap">{request.referenceNumber}</Td>
                            <Td>{request.requesterName}</Td>
                            <Td>{formatDateTime(request.preferredStartAt)}</Td>
                            <Td>
                            <Badge>{SOURCE_LABELS[request.source]}</Badge>
                            </Td>
                            <Td className="whitespace-nowrap text-muted">{formatAge(request.createdAt, now)}</Td>
                            <Td>
                            <ButtonLink
                                to={`/requests/${request.id}`}
                                variant="secondary"
                                size="sm"
                                aria-label={`Review request ${request.referenceNumber} from ${request.requesterName}`}
                            >
                                Review
                            </ButtonLink>
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
                        <StatusBadge status="pending" />
                        </div>
                        <p className="mt-1 text-sm text-muted">
                        {request.referenceNumber} · {formatDateTime(request.preferredStartAt)}
                        </p>
                        <ButtonLink
                        to={`/requests/${request.id}`}
                        variant="secondary"
                        className="mt-3 w-full"
                        aria-label={`Review request ${request.referenceNumber} from ${request.requesterName}`}
                        >
                        Review
                        </ButtonLink>
                    </li>
                    ))}
                </ul>
                </>
            )}
        </Card>
    )
}
export default PendingRequestsCard