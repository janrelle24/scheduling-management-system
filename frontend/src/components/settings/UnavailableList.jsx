import Button from '../ui/Button'
import { Table, Td, Th } from '../ui/Table'
import { formatDate, formatShortDate, formatTimeRange, manilaIso } from '../../utils/datetime'

// "Dec 25, 2026" for a whole day, "Oct 30, 1:00–5:00 PM" for part of one.
const when = (entry) =>
    entry.start
        ? `${formatShortDate(manilaIso(entry.date, '12:00'))}, ${formatTimeRange(manilaIso(entry.date, entry.start), manilaIso(entry.date, entry.end))}`
        : formatDate(manilaIso(entry.date, '12:00'))

// Holidays and unavailable periods, in date order. Remove only changes the draft until Save.
function UnavailableList({ entries, errors, onRemove }) {
    const problem = Object.entries(errors).find(([key]) => key.startsWith('unavailable.'))?.[1]

    if (entries.length === 0) return <p className="text-muted">No holidays or unavailable periods.</p>
    return (
        <>
            <Table label="Holidays and unavailable periods">
            <thead>
                <tr>
                <Th>Date / period</Th>
                <Th>Label</Th>
                <Th>
                    <span className="sr-only">Action</span>
                </Th>
                </tr>
            </thead>
            <tbody>
                {[...entries]
                .sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? '').localeCompare(b.start ?? ''))
                .map((entry) => (
                    <tr key={entry.id}>
                    <Td className="whitespace-nowrap">{when(entry)}</Td>
                    <Td>{entry.label}</Td>
                    <Td>
                        <Button variant="secondary" size="sm" aria-label={`Remove ${entry.label}`} onClick={() => onRemove(entry.id)}>
                        Remove
                        </Button>
                    </Td>
                    </tr>
                ))}
            </tbody>
            </Table>
            {problem && (
            <p role="alert" className="mt-2 text-sm font-medium text-rejected-fg">
                {problem}
            </p>
            )}
        </>
    )
}

export default UnavailableList