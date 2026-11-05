function FilterSelect({ label, value, onChange, options }) {
    return (
        <select
            aria-label={label}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="min-h-11 rounded-lg border border-brand bg-surface px-3 text-base font-semibold text-brand hover:bg-brand-soft"
        >
            <option value="">{label}: All</option>
            {options.map((option) => (
            <option key={option.value} value={option.value}>
                {label}: {option.label}
            </option>
            ))}
        </select>
    )
}

export default FilterSelect
