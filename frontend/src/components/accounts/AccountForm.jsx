import { useState } from 'react'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Checkbox from '../ui/Checkbox'
import SelectField from '../ui/SelectField'
import TextField from '../ui/TextField'
import {
    ADMIN_PERMISSION_OPTIONS,
    PERMISSION_OPTIONS,
    ROLES,
    isOptionChecked,
    normalizePermissions,
    setOption,
} from '../../utils/accountPermissions'
import { LIMITS, validateAccountForm } from '../../utils/validators'

const FIELD_ORDER = ['fullName', 'email', 'role']

// Name, (work email when creating), role and permissions. Used for "Add staff account" (a dialog)
// and "Edit: …" (a panel).
//   onSubmit(values)  does the save and throws the service's error on failure
//   onBlocked(error)  the last-administrator rule refused it: the page shows its dialog
//   leftAction        a button shown at the left of the footer (Cancel, or Deactivate)
function AccountForm({
    mode,
    account,
    onSubmit,
    onBlocked,
    leftAction,
    submitLabel,
    savingLabel,
    idPrefix,
}){
    const creating = mode === 'create'
    const [values, setValues] = useState({
        fullName: account?.fullName ?? '',
        email: '',
        role: account?.role ?? 'staff',
      // a new account starts with the two everyday permissions ticked, as in the design
        permissions: account?.permissions ?? ['requests.view', 'appointments.view', 'requests.create'],
    })
    const [errors, setErrors] = useState({})
    const [failure, setFailure] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const isAdministrator = values.role === 'administrator'

    const change = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }))

    // Switching role also drops or adds the permissions that belong to that role.
    function changeRole(event) {
        const role = event.target.value
        setValues((current) => ({ ...current, role, permissions: normalizePermissions(role, current.permissions).permissions }))
    }

    const toggle = (option) => (event) =>
        setValues((current) => ({ ...current, permissions: setOption(current.permissions, option, event.target.checked) }))

    function focusFirstError(fieldErrors) {
        const first = FIELD_ORDER.find((field) => fieldErrors[field])
        if (first) document.getElementById(`${idPrefix}-${first}`)?.focus()
    }

    async function handleSubmit(event) {
        event.preventDefault()
        if (submitting) return
        setFailure(null)
    
        const fieldErrors = validateAccountForm(values, { requireEmail: creating })
        setErrors(fieldErrors)
        if (Object.keys(fieldErrors).length > 0) {
            focusFirstError(fieldErrors)
            return
        }
    
        setSubmitting(true)
        try {
            await onSubmit(values)
        } catch (error) {
            if (error.code === 'last_administrator') {
                onBlocked?.(error)
            } else if (error.details?.fieldErrors) {
                setErrors(error.details.fieldErrors)
                focusFirstError(error.details.fieldErrors)
            } else if (error.status === 403) {
                setFailure("You don't have permission to manage accounts.")
            } else {
                setFailure("We couldn't save the account. Please try again.")
            }
        } finally {
            setSubmitting(false)
        }
    }

    const renderOption = (option) => (
        <div key={option.id}>
            <Checkbox
                label={option.label}
                checked={isOptionChecked(option, values.permissions)}
                onChange={toggle(option)}
                aria-describedby={option.hint ? `${idPrefix}-${option.id}-hint` : undefined}
            />
            {option.hint && (
                <p id={`${idPrefix}-${option.id}-hint`} className="ml-8 text-sm text-muted">
                {option.hint}
                </p>
            )}
        </div>
    )

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {failure && <Alert tone="error">{failure}</Alert>}
        
            <TextField
                id={`${idPrefix}-fullName`}
                label="Full name"
                autoComplete="off"
                maxLength={LIMITS.nameMax}
                value={values.fullName}
                onChange={change('fullName')}
                error={errors.fullName}
            />
            {creating && (
                <TextField
                id={`${idPrefix}-email`}
                label="Work email"
                type="email"
                inputMode="email"
                autoComplete="off"
                value={values.email}
                onChange={change('email')}
                error={errors.email}
                />
            )}
            <SelectField id={`${idPrefix}-role`} label="Role" value={values.role} onChange={changeRole} error={errors.role}>
                {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                    {role.label}
                </option>
                ))}
            </SelectField>
        
            <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 font-semibold text-ink">Permissions</legend>
                {PERMISSION_OPTIONS.map(renderOption)}
        
                {isAdministrator && (
                <>
                    <p className="mt-1 text-sm text-muted">
                    Administrators always manage accounts and scheduling settings.
                    </p>
                    {ADMIN_PERMISSION_OPTIONS.map(renderOption)}
                    <Alert tone="warning">Administrators cannot approve requests unless this permission is granted explicitly.</Alert>
                </>
                )}
                {errors.permissions && (
                <p role="alert" className="text-sm font-medium text-rejected-fg">
                    {errors.permissions}
                </p>
                )}
            </fieldset>
        
            {creating && <p className="text-sm text-muted">An invitation email lets them set their own password.</p>}
        
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>{leftAction}</div>
                <Button type="submit" disabled={submitting}>
                {submitting ? savingLabel : submitLabel}
                </Button>
            </div>
        </form>
    )
}
export default AccountForm