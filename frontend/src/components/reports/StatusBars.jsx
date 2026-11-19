import Card from '../ui/Card'
import { STATUS_LABELS } from '../../utils/status'

const ORDER = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed']

// "Appointments by status": one bar per status, sized against the largest count, with the number.
// The bars are decoration; the numbers carry the meaning (and are what a screen reader reads).
function StatusBars({ counts, total }) {
    const largest = Math.max(1, ...ORDER.map((status) => counts[status] ?? 0))

    return (
        <Card title="Appointments by status">
        <ul className="flex flex-col gap-3">
            {ORDER.map((status) => {
            const count = counts[status] ?? 0
            return (
                <li key={status} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3">
                <span className="text-ink">{STATUS_LABELS[status]}</span>
                <span aria-hidden="true" className="h-4 overflow-hidden rounded-full bg-border">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${(count / largest) * 100}%` }} />
                </span>
                <span className="text-right font-semibold text-ink">{count}</span>
                </li>
            )
            })}
        </ul>
        <p className="mt-4 text-sm text-muted">
            {total === 0 ? 'No requests were submitted in this range.' : `${total} ${total === 1 ? 'request' : 'requests'} in this range.`}
        </p>
        </Card>
    )
}

export default StatusBars
