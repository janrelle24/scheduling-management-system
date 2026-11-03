import { useId } from 'react'
import FieldShell from './FieldShell'
import { controlClass } from './controlStyles'

function TextField( {
    label,
    required,
    hint,
    error,
    id,
    className,
    ...inputProps
}){
    const autoId = useId()
    const fieldId = id ?? autoId

    const describedBy =
        [hint && `${fieldId}-hint`, error && `${fieldId}-error`].filter(Boolean).join(' ') ||
        undefined

    return (
        <FieldShell id={fieldId} label={label} required={required} hint={hint} error={error}>
            <input
            id={fieldId}
            aria-required={required || undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={controlClass(Boolean(error), className)}
            {...inputProps}
            />
        </FieldShell>
    )
}
export default TextField