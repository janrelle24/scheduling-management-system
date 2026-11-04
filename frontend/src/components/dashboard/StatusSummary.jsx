import ErrorState from '../ui/ErrorState'
import StatCard from './StatCard'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getStatusCounts } from '../../services/requestService'
import { DISPLAY_STATUSES } from '../../utils/status'

const loadCounts = () => getStatusCounts()

function StatusSummary(){
    const { status, data, reload } = useAsyncData(loadCounts)

    if (status === 'error') {
        return <ErrorState message="We couldn't load the request counts." onRetry={reload} />
    }

    return (
        <section
        aria-label="Requests by status"
        aria-busy={status === 'loading'}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"
        >
        {DISPLAY_STATUSES.map((name) => (
            <StatCard key={name} status={name} value={data ? data.statusCounts[name] : '—'} />
        ))}
        </section>
    )
}
export default StatusSummary