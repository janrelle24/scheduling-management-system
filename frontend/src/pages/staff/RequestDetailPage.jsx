import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ButtonLink from '../../components/ui/ButtonLink'
import Card from '../../components/ui/Card'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import TextLink from '../../components/ui/TextLink'
import StatusBadge from '../../components/StatusBadge'
import ApproveDialog from '../../components/requests/detail/ApproveDialog'
import NotificationsCard from '../../components/requests/detail/NotificationsCard'
import RequestSummaryCard from '../../components/requests/detail/RequestSummaryCard'
import StatusHistoryCard from '../../components/requests/detail/StatusHistoryCard'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useSession } from '../../hooks/useSession'
import { useToast } from '../../hooks/useToast'
import { getRequest } from '../../services/requestService'
import { formatDateTime } from '../../utils/datetime'
import { PERMISSIONS } from '../../utils/permissions'
import { SOURCE_LABELS } from '../../utils/status'

// Read-only for now. Approve, Reject, Reschedule and Cancel arrive with their own dialogs
// (separate features), each shown only to users with the matching permission.

function RequestDetailPage() {
    const { id } = useParams()
    const load = useCallback(() => getRequest(id), [id])
    const { status, data: request, error, reload } = useAsyncData(load)
    const { can } = useSession()
    const toast = useToast()
    const [approving, setApproving] = useState(false)
    const canApprove = can(PERMISSIONS.APPOINTMENTS_APPROVE)

    // The two confirmation messages follow the design; a request without an email gets its own.
    function handleApproved({ notification }) {
        setApproving(false)
        if (notification === 'failed') {
        toast.show({
            tone: 'warning',
            title: 'Confirmed.',
            message: 'The email could not be sent and will be retried. Status unchanged.',
        })
        } else if (notification === 'none') {
        toast.show({
            tone: 'success',
            title: 'Appointment confirmed.',
            message: 'No email on file, so the requester was not notified.',
        })
        } else {
        toast.show({ tone: 'success', title: 'Appointment confirmed.', message: 'Confirmation email queued.' })
        }
        reload()
    }
    function handleAlreadyHandled() {
        setApproving(false)
        toast.show({
            tone: 'warning',
            title: 'Already handled.',
            message: 'Another staff member already handled this request. Showing its latest status.',
        })
        reload()
    }

    return (
        <div className="flex flex-col gap-6">
            <TextLink to="/requests" className="self-start">
                ← Back to requests
            </TextLink>
        
            {status === 'loading' && <Spinner label="Loading request…" />}
        
            {status === 'error' && error?.status === 404 && (
                <Card title="Request not found">
                <p className="mb-4 text-muted">We couldn't find that request. It may have been removed, or the link is wrong.</p>
                <ButtonLink to="/requests">Back to requests</ButtonLink>
                </Card>
            )}
        
            {status === 'error' && error?.status !== 404 && (
                <ErrorState message="We couldn't load this request." onRetry={reload} />
            )}
        
            {status === 'success' && (
                <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-ink lg:text-3xl">{request.requesterName}</h1>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-muted">
                        <span className="font-mono text-sm">{request.referenceNumber}</span>
                        <StatusBadge status={request.displayStatus} />
                        <Badge>{SOURCE_LABELS[request.source]}</Badge>
                        <span>· Submitted {formatDateTime(request.createdAt)}</span>
                        </div>
                    </div>
                    {request.displayStatus === 'pending' && (
                        <div className="flex max-w-xs flex-col gap-1">
                            <Button disabled={!canApprove} aria-describedby={canApprove ? undefined : 'approve-help'} onClick={() => setApproving(true)}>
                            Approve & confirm
                            </Button>
                            {!canApprove && (
                            <p id="approve-help" className="text-sm text-muted">
                                Requires approval permission. The server checks this on every action.
                            </p>
                            )}
                        </div>
                    )}
                </div>
                {approving && (
                    <ApproveDialog
                    request={request}
                    onClose={() => setApproving(false)}
                    onApproved={handleApproved}
                    onAlreadyHandled={handleAlreadyHandled}
                    />
                )}

                <div className="grid items-start gap-6 lg:grid-cols-2">
                    <div className="flex flex-col gap-6">
                        <RequestSummaryCard request={request} />
                        <StatusHistoryCard request={request} />
                    </div>
                    <NotificationsCard request={request} />
                </div>
                </>
            )}
        </div>
    )
}
export default RequestDetailPage
