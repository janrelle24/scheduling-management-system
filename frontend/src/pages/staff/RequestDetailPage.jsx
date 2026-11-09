import { useCallback } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import ButtonLink from '../../components/ui/ButtonLink'
import Card from '../../components/ui/Card'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import TextLink from '../../components/ui/TextLink'
import StatusBadge from '../../components/StatusBadge'
import NotificationsCard from '../../components/requests/detail/NotificationsCard'
import RequestSummaryCard from '../../components/requests/detail/RequestSummaryCard'
import RequestActions from '../../components/requests/detail/RequestActions'
import StatusHistoryCard from '../../components/requests/detail/StatusHistoryCard'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getRequest } from '../../services/requestService'
import { formatDateTime } from '../../utils/datetime'
import { SOURCE_LABELS } from '../../utils/status'


// The header buttons (Approve, Reject, Reschedule, Cancel) live in RequestActions.

function RequestDetailPage() {
    const { id } = useParams()
    const created = useLocation().state?.created
    const load = useCallback(() => getRequest(id), [id])
    const { status, data: request, error, reload } = useAsyncData(load)
    

    return (
        <div className="flex flex-col gap-6">
            <TextLink to="/requests" className="self-start">
                ← Back to requests
            </TextLink>

            {created && (
                <Alert tone="success" title="Request saved.">
                    Reference number <strong className="font-mono">{created.referenceNumber}</strong>. Give this number to the
                    requester.
                    {created.timeMayBeUnavailable &&
                        ' The preferred time overlaps a confirmed appointment, so it may need to change when the request is approved.'}
                    {!created.emailOnFile && ' There is no email on file, so the requester will not receive notifications.'}
                </Alert>
            )}

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
                    <RequestActions request={request} onChanged={reload} />
                </div>
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
