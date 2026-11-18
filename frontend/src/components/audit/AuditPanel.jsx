import { useCallback } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import ErrorState from '../ui/ErrorState'
import Pagination from '../ui/Pagination'
import Spinner from '../ui/Spinner'
import { Table, Td, Th } from '../ui/Table'
import StatusBadge from '../StatusBadge'
import AuditToolbar from './AuditToolbar'
import { useAsyncData } from '../../hooks/useAsyncData'
import { listAuditLogs } from '../../services/auditService'
import { formatDateTime } from '../../utils/datetime'
import { PAGE_SIZE } from '../../utils/listParams'

// The Audit log tab: a read-only list. There is nothing here that edits or deletes an entry.
function AuditPanel({ filters, onChange, onClear }) {
    const { q, action, dateFrom, dateTo, page } = filters
    const filtered = Boolean(q || action || dateFrom || dateTo)

    const load = useCallback(
        () => listAuditLogs({ search: q, action, from: dateFrom, to: dateTo, page, pageSize: PAGE_SIZE }),
        [q, action, dateFrom, dateTo, page],
    )
    const { status, data, reload } = useAsyncData(load)
    const rows = data?.items ?? []
    const pastTheEnd = status === 'success' && rows.length === 0 && data.total > 0 && page > 1

    return (
        <div className="flex flex-col gap-4">
            <AuditToolbar filters={filters} onChange={onChange} onClear={onClear} hasFilters={filtered} />
    
            <Card flush>
            {status === 'loading' && <Spinner label="Loading the audit log…" />}
            {status === 'error' && (
                <div className="p-4">
                <ErrorState message="We couldn't load the audit log." onRetry={reload} />
                </div>
            )}
            {pastTheEnd && (
                <EmptyState
                message="That page doesn't exist. There are fewer results than that."
                action={
                    <Button variant="secondary" onClick={() => onChange({ page: 1 })}>
                    Back to first page
                    </Button>
                }
                />
            )}
            {status === 'success' && !pastTheEnd && rows.length === 0 && (
                <EmptyState
                message={filtered ? 'No matching records. Clear filters or try a different search.' : 'The audit log is empty.'}
                action={
                    filtered && (
                    <Button variant="secondary" onClick={onClear}>
                        Clear filters
                    </Button>
                    )
                }
                />
            )}
    
            {status === 'success' && rows.length > 0 && (
                <>
                <div className="hidden md:block">
                    <Table label="Audit log">
                    <thead>
                        <tr>
                        <Th>When</Th>
                        <Th>Actor</Th>
                        <Th>Action</Th>
                        <Th>Record</Th>
                        <Th>Result</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                        <tr key={row.id}>
                            <Td className="whitespace-nowrap">{formatDateTime(row.createdAt)}</Td>
                            <Td>{row.actorName}</Td>
                            <Td>{row.actionLabel}</Td>
                            <Td className="break-words">{row.recordLabel}</Td>
                            <Td>
                            <StatusBadge status={row.result} />
                            </Td>
                        </tr>
                        ))}
                    </tbody>
                    </Table>
                </div>
    
                <ul className="flex flex-col gap-3 p-4 md:hidden">
                    {rows.map((row) => (
                    <li key={row.id} className="rounded-lg border border-border p-4">
                        <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold text-ink">{row.actionLabel}</p>
                        <StatusBadge status={row.result} />
                        </div>
                        <p className="mt-1 text-sm break-words text-muted">
                        {row.actorName} · {formatDateTime(row.createdAt)}
                        </p>
                        {row.recordLabel && <p className="mt-1 text-sm break-words text-ink">{row.recordLabel}</p>}
                    </li>
                    ))}
                </ul>
    
                <Pagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={data.total}
                    onPageChange={(next) => onChange({ page: next }, { replace: false })}
                />
                </>
            )}
            </Card>

            <p className="text-sm text-muted">No edit or delete controls. Passwords and secrets are never recorded.</p>
        </div>
    )
}

export default AuditPanel