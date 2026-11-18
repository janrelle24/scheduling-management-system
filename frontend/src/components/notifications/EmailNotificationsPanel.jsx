import { useCallback, useState } from 'react'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import ErrorState from '../ui/ErrorState'
import Pagination from '../ui/Pagination'
import Spinner from '../ui/Spinner'
import { Table, Td, Th } from '../ui/Table'
import StatusBadge from '../StatusBadge'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useToast } from '../../hooks/useToast'
import { listEmailNotifications, retryEmailNotification } from '../../services/notificationService'
import { PAGE_SIZE } from '../../utils/listParams'
import { failedBanner, nextRetryText } from '../../utils/notificationDisplay'
import { NOTIFICATION_LABELS } from '../../utils/requestTimeline'

const typeOf = (row) => NOTIFICATION_LABELS[row.templateKey] ?? row.templateKey

// The Email notifications tab: delivery status and Retry for failed emails.
// A failed (or retried) email never changes the request or appointment it belongs to (FR-23).
function EmailNotificationsPanel({ page, onPageChange }) {
    const toast = useToast()
    const load = useCallback(() => listEmailNotifications({ page, pageSize: PAGE_SIZE }), [page])
    const { status, data, reload } = useAsyncData(load)
    const [updated, setUpdated] = useState({}) // rows changed by Retry, by id (kept without reloading the table)
    const [retryingId, setRetryingId] = useState(null)

    const rows = (data?.items ?? []).map((row) => updated[row.id] ?? row)
    const pastTheEnd = status === 'success' && rows.length === 0 && data.total > 0 && page > 1

    // The banner counts every failed email, not only this page; rows fixed here no longer count.
    const fixedHere = (data?.items ?? []).filter((row) => row.status === 'failed' && updated[row.id]?.status !== 'failed').length
    const failedNow = Math.max(0, (data?.failedCount ?? 0) - fixedHere)
    const pageErrors = [...new Set(rows.filter((row) => row.status === 'failed').map((row) => row.lastError).filter(Boolean))]
    const banner = failedBanner(failedNow, pageErrors.length > 0 ? pageErrors : (data?.failedErrors ?? []))

    async function handleRetry(row) {
        setRetryingId(row.id)
        try {
        const { notification, result } = await retryEmailNotification(row.id)
        setUpdated((current) => ({ ...current, [notification.id]: notification }))
        toast.show(
            result === 'sent'
            ? { tone: 'success', title: 'Email sent.', message: `${typeOf(row)} email to ${row.recipientEmail} was delivered.` }
            : {
                tone: 'warning',
                title: 'Still failing.',
                message: 'The email could not be sent and will be retried automatically. Status unchanged.',
                },
        )
        } catch (error) {
        if (error.code === 'not_failed') {
            setUpdated((current) => ({ ...current, [error.details.notification.id]: error.details.notification }))
            toast.show({ tone: 'warning', title: 'Nothing to retry.', message: 'That email was already handled. Showing its latest status.' })
        } else if (error.status === 403) {
            toast.show({ tone: 'warning', title: 'Not allowed.', message: "You don't have permission to retry emails." })
        } else {
            toast.show({ tone: 'warning', title: 'Not retried.', message: "We couldn't retry the email. Please try again." })
        }
        } finally {
        setRetryingId(null)
        }
    }

    const retryButton = (row, className) =>
        row.status === 'failed' && (
        <Button
            variant="secondary"
            size="sm"
            className={className}
            disabled={retryingId === row.id}
            aria-label={`Retry ${typeOf(row)} email to ${row.recipientEmail}`}
            onClick={() => handleRetry(row)}
        >
            {retryingId === row.id ? 'Retrying…' : 'Retry'}
        </Button>
        )

    return (
        <div className="flex flex-col gap-4">
        {banner && <Alert tone="warning">{banner}</Alert>}

        <Card flush>
            {status === 'loading' && <Spinner label="Loading emails…" />}
            {status === 'error' && (
            <div className="p-4">
                <ErrorState message="We couldn't load the email notifications." onRetry={reload} />
            </div>
            )}
            {pastTheEnd && (
            <EmptyState
                message="That page doesn't exist. There are fewer results than that."
                action={
                <Button variant="secondary" onClick={() => onPageChange(1)}>
                    Back to first page
                </Button>
                }
            />
            )}
            {status === 'success' && !pastTheEnd && rows.length === 0 && <EmptyState message="No emails have been queued yet." />}

            {status === 'success' && rows.length > 0 && (
            <>
                <div className="hidden md:block">
                <Table label="Email notifications">
                    <thead>
                    <tr>
                        <Th>Recipient</Th>
                        <Th>Type</Th>
                        <Th>Record</Th>
                        <Th>Status</Th>
                        <Th>Attempts</Th>
                        <Th>Next retry</Th>
                        <Th>
                        <span className="sr-only">Action</span>
                        </Th>
                    </tr>
                    </thead>
                    <tbody>
                    {rows.map((row) => (
                        <tr key={row.id}>
                        <Td className="break-all">{row.recipientEmail}</Td>
                        <Td>{typeOf(row)}</Td>
                        <Td className="font-mono text-sm whitespace-nowrap">{row.referenceNumber}</Td>
                        <Td>
                            <StatusBadge status={row.status} />
                            {row.status === 'failed' && row.lastError && (
                            <span className="mt-1 block text-sm text-muted">{row.lastError}</span>
                            )}
                        </Td>
                        <Td>{row.attemptCount}</Td>
                        <Td className="whitespace-nowrap">{nextRetryText(row)}</Td>
                        <Td>{retryButton(row)}</Td>
                        </tr>
                    ))}
                    </tbody>
                </Table>
                </div>

                <ul className="flex flex-col gap-3 p-4 md:hidden">
                {rows.map((row) => (
                    <li key={row.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-ink">{typeOf(row)}</p>
                        <StatusBadge status={row.status} />
                    </div>
                    <p className="mt-1 text-sm break-all text-muted">{row.recipientEmail}</p>
                    <p className="mt-1 text-sm text-muted">
                        <span className="font-mono">{row.referenceNumber}</span> · {row.attemptCount}{' '}
                        {row.attemptCount === 1 ? 'attempt' : 'attempts'} · next retry {nextRetryText(row)}
                    </p>
                    {row.status === 'failed' && row.lastError && <p className="mt-1 text-sm text-muted">{row.lastError}</p>}
                    {retryButton(row, 'mt-3 w-full')}
                    </li>
                ))}
                </ul>

                <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={onPageChange} />
            </>
            )}
        </Card>

        <p className="text-sm text-muted">A failed email never changes an appointment's status.</p>
        </div>
    )
}

export default EmailNotificationsPanel