import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import FilterSelect from '../ui/FilterSelect'
import TextField from '../ui/TextField'
import { controlClass } from '../ui/controlStyles'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { SOURCE_LABELS, STATUS_LABELS } from '../../utils/status'


export default function RecordToolbar({ filters, statusOptions, onChange, onClear, hasFilters }) {
    const [searchInput, setSearchInput] = useState(filters.q)
    const search = useDebouncedValue(searchInput, 300)
    const lastSent = useRef(filters.q) 
    useEffect(() => {
        if (search === lastSent.current) return
        lastSent.current = search
        onChange({ q: search.trim() })
    }, [search, onChange])

    const [dateOpen, setDateOpen] = useState(Boolean(filters.dateFrom || filters.dateTo))
    const [dates, setDates] = useState({ from: filters.dateFrom, to: filters.dateTo })
    const rangeInvalid = Boolean(dates.from && dates.to && dates.from > dates.to)

    function changeDate(name, value) {
        const next = { ...dates, [name]: value }
        setDates(next)
        
        if (!(next.from && next.to && next.from > next.to)) {
            onChange({ dateFrom: next.from, dateTo: next.to })
        }
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
            <input
                type="search"
                aria-label="Search"
                placeholder="Search reference, name or purpose"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className={controlClass(false, 'min-w-60 flex-1')}
            />
            <FilterSelect
                label="Status"
                value={filters.status}
                onChange={(status) => onChange({ status })}
                options={statusOptions.map((value) => ({ value, label: STATUS_LABELS[value] }))}
            />
            <FilterSelect
                label="Source"
                value={filters.source}
                onChange={(source) => onChange({ source })}
                options={Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Button
                variant="secondary"
                aria-expanded={dateOpen}
                aria-controls="date-range-fields"
                onClick={() => setDateOpen((open) => !open)}
            >
                Date range{filters.dateFrom || filters.dateTo ? ' ✓' : ''}
            </Button>
            </div>
    
            {dateOpen && (
            <div
                id="date-range-fields"
                className="grid items-start gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2"
            >
                <TextField
                label="From"
                type="date"
                value={dates.from}
                onChange={(event) => changeDate('from', event.target.value)}
                />
                <TextField
                label="To"
                type="date"
                value={dates.to}
                error={rangeInvalid ? 'The start date must be on or before the end date. This range is not applied.' : undefined}
                onChange={(event) => changeDate('to', event.target.value)}
                />
                <p className="text-sm text-muted sm:col-span-2">
                Filters by preferred date (requests) or appointment date (appointments), Asia/Manila.
                </p>
            </div>
            )}
    
            {hasFilters && (
            <div>
                <Button variant="secondary" size="sm" onClick={onClear}>
                Clear filters
                </Button>
            </div>
            )}
        </div>
    )
}