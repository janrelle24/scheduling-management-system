import Button from './Button'

function Pagination({ page, pageSize, total, onPageChange }){
    if (total === 0) return null
    const first = (page - 1) * pageSize + 1
    const last = Math.min(page * pageSize, total)
    const pageCount = Math.ceil(total / pageSize)

    return (
        <nav
        aria-label="Pagination"
        className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"
        >
        <p className="text-muted" aria-live="polite">
            Showing {first}–{last} of {total}
        </p>
        <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
            </Button>
            <Button variant="secondary" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
            Next
            </Button>
        </div>
        </nav>
    )
}
export default Pagination