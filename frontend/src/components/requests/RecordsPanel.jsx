import { useCallback } from 'react'
import Button from '../ui/Button'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import ErrorState from '../ui/ErrorState'
import Pagination from '../ui/Pagination'
import Spinner from '../ui/Spinner'
import AppointmentsTable from './AppointmentsTable'
import RecordToolbar from './RecordToolbar'
import RequestsTable from './RequestsTable'
import { useAsyncData } from '../../hooks/useAsyncData'
import { listAppointments } from '../../services/appointmentService'
import { listRequests } from '../../services/requestService'
import { hasActiveFilters, PAGE_SIZE } from '../../utils/listParams'
import { APPOINTMENT_STATUSES, DISPLAY_STATUSES } from '../../utils/status'


const KINDS = {
    requests: {
        fetchPage: listRequests,
        statuses: DISPLAY_STATUSES,
        Table: RequestsTable,
        noun: 'requests',
    },
    appointments: {
        fetchPage: listAppointments,
        statuses: APPOINTMENT_STATUSES,
        Table: AppointmentsTable,
        noun: 'appointments',
    },
}

function RecordsPanel({ kind, filters, onChange, onClear }) {
    const { fetchPage, statuses, Table, noun } = KINDS[kind]
    const { q, status, source, dateFrom, dateTo, page } = filters
    const filtered = hasActiveFilters(filters)

    // Changes only when a filter or the page changes, so the data reloads exactly then.
    const load = useCallback(
        () => fetchPage({ search: q, status, source, dateFrom, dateTo, page, pageSize: PAGE_SIZE }),
        [fetchPage, q, status, source, dateFrom, dateTo, page],
    )
    const { status: loadStatus, data, reload } = useAsyncData(load)
    const rows = data?.items ?? []
    const pastTheEnd = loadStatus === 'success' && rows.length === 0 && data.total > 0 && page > 1

    return (
        <div className="flex flex-col gap-4">
            <RecordToolbar
            filters={filters}
            statusOptions={statuses}
            onChange={onChange}
            onClear={onClear}
            hasFilters={filtered}
            />
    
            <Card flush>
            {loadStatus === 'loading' && <Spinner label={`Loading ${noun}…`} />}
            {loadStatus === 'error' && (
                <div className="p-4">
                <ErrorState message="We couldn't load the records." onRetry={reload} />
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
    
            {loadStatus === 'success' && !pastTheEnd && rows.length === 0 && (
                <EmptyState
                message={
                    filtered
                    ? 'No matching records. Clear filters or try a different search.'
                    : `There are no ${noun} yet.`
                }
                action={
                    filtered && (
                    <Button variant="secondary" onClick={onClear}>
                        Clear filters
                    </Button>
                    )
                }
                />
            )}
    
            {loadStatus === 'success' && rows.length > 0 && (
                <>
                <Table rows={rows} />
                <Pagination
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={data.total}
                    onPageChange={(next) => onChange({ page: next }, { replace: false })}
                />
                </>
            )}
            </Card>
        </div>
    )
}

export default RecordsPanel