import StatusBadge from '../StatusBadge'
import { STATUS_LABELS } from '../../utils/status'

function StatCard({ status, value }){
    return (
        <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm text-muted">{STATUS_LABELS[status]}</p>
            <p className="mt-1 text-3xl font-bold text-ink">{value}</p>
            <div className="mt-2">
                <StatusBadge status={status} />
            </div>
        </div>
    )
}
export default StatCard