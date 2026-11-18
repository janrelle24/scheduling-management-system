import { useState } from 'react'
import Button from './Button'
import TextField from './TextField'

// A "Date range" button that reveals From and To fields. A start after the end shows a message
// and is NOT applied. The fields keep what you type; the page is told only about valid ranges.
//   onChange({ dateFrom, dateTo })     values are 'YYYY-MM-DD' or ''
function DateRangeFilter({ dateFrom, dateTo, onChange, idPrefix = 'date-range' }) {
    const [open, setOpen] = useState(Boolean(dateFrom || dateTo))
    const [dates, setDates] = useState({ from: dateFrom, to: dateTo })
    const invalid = Boolean(dates.from && dates.to && dates.from > dates.to)

    function change(name, value) {
        const next = { ...dates, [name]: value }
        setDates(next)
        if (!(next.from && next.to && next.from > next.to)) onChange({ dateFrom: next.from, dateTo: next.to })
    }

    return (
        <>
        <Button
            variant="secondary"
            aria-expanded={open}
            aria-controls={`${idPrefix}-fields`}
            onClick={() => setOpen((current) => !current)}
        >
            Date range{dateFrom || dateTo ? ' ✓' : ''}
        </Button>
        {open && (
            <div
            id={`${idPrefix}-fields`}
            className="grid w-full items-start gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2"
            >
            <TextField label="From" type="date" value={dates.from} onChange={(event) => change('from', event.target.value)} />
            <TextField
                label="To"
                type="date"
                value={dates.to}
                error={invalid ? 'The start date must be on or before the end date. This range is not applied.' : undefined}
                onChange={(event) => change('to', event.target.value)}
            />
            </div>
        )}
        </>
    )
}

export default DateRangeFilter
