import { useEffect, useRef, useState } from 'react'
import Button from '../ui/Button'
import DateRangeFilter from '../ui/DateRangeFilter'
import FilterSelect from '../ui/FilterSelect'
import { controlClass } from '../ui/controlStyles'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { AUDIT_ACTIONS } from '../../services/auditService'

// Search, Action and Date range above the audit table.
//   filters: the values in the URL      onChange(changes): write to the URL (page goes back to 1)
function AuditToolbar({ filters, onChange, onClear, hasFilters }) {
    const [searchInput, setSearchInput] = useState(filters.q)
    const search = useDebouncedValue(searchInput, 300)
    const lastSent = useRef(filters.q) // never write the same search twice (or fight the Back button)
    useEffect(() => {
        if (search === lastSent.current) return
        lastSent.current = search
        onChange({ q: search.trim() })
    }, [search, onChange])

    return (
        <div className="flex flex-wrap gap-3">
            <input
            type="search"
            aria-label="Search"
            placeholder="Search actor, action or record"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className={controlClass(false, 'min-w-60 flex-1')}
            />
            <FilterSelect
            label="Action"
            value={filters.action}
            onChange={(action) => onChange({ action })}
            options={AUDIT_ACTIONS}
            />
            <DateRangeFilter
            idPrefix="audit-date-range"
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            onChange={onChange}
            />
            {hasFilters && (
            <div className="w-full">
                <Button variant="secondary" size="sm" onClick={onClear}>
                Clear filters
                </Button>
            </div>
            )}
        </div>
    )
}

export default AuditToolbar