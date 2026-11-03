function FieldShell({ id, label, required, hint, error, children }){
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-semibold text-ink">
                {label}
                {required && <span className="font-normal text-muted"> (required)</span>}
            </label>
            {children}
            {hint && (
                <p id={`${id}-hint`} className="text-sm text-muted">
                {hint}
                </p>
            )}
            {error && (
                <p id={`${id}-error`} className="text-sm text-rejected-fg">
                {error}
                </p>
            )}
            </div>
    )
}
export default FieldShell