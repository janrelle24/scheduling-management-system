import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ButtonLink from '../../components/ui/ButtonLink'
import Tabs from '../../components/ui/Tabs'
import PageHeader from '../../components/PageHeader'
import RecordsPanel from '../../components/requests/RecordsPanel'
import { useSession } from '../../hooks/useSession'
import { readListParams } from '../../utils/listParams'
import { PERMISSIONS } from '../../utils/permissions'
import { APPOINTMENT_STATUSES, DISPLAY_STATUSES } from '../../utils/status'

const FILTER_NAMES = ['q', 'status', 'source', 'dateFrom', 'dateTo']


function RequestsPage() {
    const { can } = useSession()
    const [params, setParams] = useSearchParams()
    const [clearCount, setClearCount] = useState(0)

    const tabs = []
    if (can(PERMISSIONS.REQUESTS_VIEW)) tabs.push({ key: 'requests', label: 'Requests' })
    if (can(PERMISSIONS.APPOINTMENTS_VIEW)) tabs.push({ key: 'appointments', label: 'Appointments' })
    const activeTab = tabs.find((tab) => tab.key === params.get('tab'))?.key ?? tabs[0]?.key

    const filters = readListParams(
        params,
        activeTab === 'requests' ? DISPLAY_STATUSES : APPOINTMENT_STATUSES,
    )


    const update = useCallback(
        (changes, { replace = true } = {}) => {
        setParams(
            (previous) => {
            const next = new URLSearchParams(previous)
            for (const [name, value] of Object.entries(changes)) {
                if (value) next.set(name, String(value))
                else next.delete(name)
            }
            if (!('page' in changes) || Number(changes.page) <= 1) next.delete('page')
            return next
            },
            { replace }, // filters replace the history entry; paging adds one so Back goes to the previous page
        )
        },
        [setParams],
    )

    function clearFilters() {
        update(Object.fromEntries(FILTER_NAMES.map((name) => [name, ''])))
        setClearCount((count) => count + 1) // remounts the panel so the search box and dates empty too
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Requests & Appointments"
                subtitle="All records you have permission to view"
                action={
                can(PERMISSIONS.REQUESTS_CREATE) && (
                    <ButtonLink to="/requests/new">+ New In-Person Request</ButtonLink>
                )
                }
            />

            <Tabs
                tabs={tabs}
                value={activeTab}
                onChange={(key) => setParams({ tab: key })} // switching tabs clears the filters
                label="Record type"
                idPrefix="records"
            />

            <div role="tabpanel" id="records-panel" aria-labelledby={`records-tab-${activeTab}`}>
                {/* key: a different tab (or Clear filters) starts the panel fresh */}
                <RecordsPanel
                key={`${activeTab}-${clearCount}`}
                kind={activeTab}
                filters={filters}
                onChange={update}
                onClear={clearFilters}
                />
            </div>
        </div>
    )
}

export default RequestsPage