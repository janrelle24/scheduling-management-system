import { useState } from 'react'
import Card from '../ui/Card'
import Pagination from '../ui/Pagination'
import { Table, Td, Th } from '../ui/Table'
import { formatShortDate, formatTimeRange } from '../../utils/datetime'

const PAGE_SIZE = 10

// "Confirmed appointments": Date, Time, Requester only (no contact details). 10 rows a page on
// screen; the exported files contain every row. Mount it with a key per range so the page resets.

function ConfirmedTable({ appointments }){
    const [page, setPage] = useState(1)
    const rows = appointments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    return (
        <Card title="Confirmed appointments" flush>
            {appointments.length === 0 ? (
                <p className="px-5 pb-5 text-muted">No confirmed appointments in this range.</p>
            ) : (
                <>
                <div className="hidden md:block">
                    <Table label="Confirmed appointments">
                    <thead>
                        <tr>
                        <Th>Date</Th>
                        <Th>Time</Th>
                        <Th>Requester</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                        <tr key={row.id}>
                            <Td className="whitespace-nowrap">{formatShortDate(row.startAt)}</Td>
                            <Td className="whitespace-nowrap">{formatTimeRange(row.startAt, row.endAt)}</Td>
                            <Td className="break-words">{row.requesterName}</Td>
                        </tr>
                        ))}
                    </tbody>
                    </Table>
                </div>
        
                <ul className="flex flex-col gap-3 p-4 md:hidden">
                    {rows.map((row) => (
                    <li key={row.id} className="rounded-lg border border-border p-3">
                        <p className="font-semibold break-words text-ink">{row.requesterName}</p>
                        <p className="text-sm text-muted">
                        {formatShortDate(row.startAt)} · {formatTimeRange(row.startAt, row.endAt)}
                        </p>
                    </li>
                    ))}
                </ul>
        
                <Pagination page={page} pageSize={PAGE_SIZE} total={appointments.length} onPageChange={setPage} />
                </>
            )}
        </Card>
    )
}
export default ConfirmedTable