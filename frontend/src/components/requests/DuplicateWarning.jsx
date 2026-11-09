import Alert from '../ui/Alert'
import { formatDateTime } from '../../utils/datetime'
import { STATUS_LABELS } from '../../utils/status'

// "Possible duplicate. REQ-… · Juan Dela Cruz · Oct 28, 2:00 PM · Pending. Review it"
// duplicates: { items: [{ id, referenceNumber, requesterName, preferredStartAt, status }], total }
// "Review it" opens the existing request in a NEW tab, so what staff already typed is not lost.

function DuplicateWarning({ duplicates}){
    const more = duplicates.total - duplicates.items.length
    return (
        <Alert tone="warning" title="Possible duplicate.">
            <ul className="mt-1 flex flex-col gap-1">
                {duplicates.items.map((item) => (
                <li key={item.id}>
                    <span className="font-mono text-sm">{item.referenceNumber}</span> · {item.requesterName} ·{' '}
                    {formatDateTime(item.preferredStartAt)} · {STATUS_LABELS[item.status]}.{' '}
                    <a
                    href={`/requests/${item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline"
                    >
                    Review it<span className="sr-only"> ({item.referenceNumber}, opens in a new tab)</span>
                    </a>
                </li>
                ))}
            </ul>
            {more > 0 && <p className="mt-1">and {more} more.</p>}
            <p className="mt-1 text-sm">Check the existing request first. You can still save this one.</p>
        </Alert>
    )
}
export default DuplicateWarning