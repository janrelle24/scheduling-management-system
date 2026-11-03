import { useId } from 'react'
import FieldShell from './FieldShell'
import { controlClass } from './controlStyles'

function SelectField({
    label,
    required,
    hint,
    error,
    id,
    className,
    children,
    ...selectProps
}){
    const autoId = useId()
    const fieldId = id ?? autoId
    const describedBy =
        [hint && `${fieldId}-hint`, error && `${fieldId}-error`].filter(Boolean).join(' ') ||
        undefined
        return (
            <FieldShell id={fieldId} label={label} required={required} hint={hint} error={error}>
                <select
                    id={fieldId}
                    aria-required={required || undefined}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={controlClass(Boolean(error), className)}
                    {...selectProps}
                >
                    {children}
                </select>
            </FieldShell>
        )
}
export default SelectField