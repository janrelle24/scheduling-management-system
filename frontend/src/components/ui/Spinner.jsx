function Spinner( { label = 'Loading…' }){
    return (
        <div role="status" className="flex items-center justify-center gap-3 py-8 text-muted">
            <svg className="size-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span>{label}</span>
        </div>
    )
}
export default Spinner