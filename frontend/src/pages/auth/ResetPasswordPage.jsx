import { useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import ButtonLink from '../../components/ui/ButtonLink'
import Spinner from '../../components/ui/Spinner'
import TextField from '../../components/ui/TextField'
import { useAsyncData } from '../../hooks/useAsyncData'
import { checkResetToken, resetPassword } from '../../services/authService'
import { PASSWORD_LIMITS, validateResetForm } from '../../utils/validators'

// "Link expired": used when the link is unknown, already used, or past its time (they look the same).
function LinkExpired() {
    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-xl font-bold text-ink">Link expired</h1>
            <p className="text-muted">This reset link is invalid or has expired.</p>
            <ButtonLink to="/forgot-password" className="w-full">
            Request a new link
            </ButtonLink>
        </div>
    )
}

// "Set a new password", reached from the emailed link: /reset-password?token=...
// The link is checked when the page opens, and again by the server when you submit.
function ResetPasswordPage() {
    const [params] = useSearchParams()
    const token = params.get('token') ?? ''
    const navigate = useNavigate()

    const load = useCallback(
        () => (token ? checkResetToken({ token }) : Promise.resolve({ valid: false })),
        [token],
    )
    const check = useAsyncData(load)
    
    const [values, setValues] = useState({ newPassword: '', confirmPassword: '' })
    const [errors, setErrors] = useState({})
    const [failure, setFailure] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [expired, setExpired] = useState(false) // the server refused the link when we submitted
    
    if (check.status === 'loading') return <Spinner label="Checking your link…" />
    if (check.status === 'error') {
    return <Alert tone="error">We couldn't check your link. Please reload the page and try again.</Alert>
    }
    if (!check.data.valid || expired) return <LinkExpired />
    
    function handleChange(field) {
        return (event) => setValues((current) => ({ ...current, [field]: event.target.value }))
    }

    async function handleSubmit(event) {
        event.preventDefault()
        if (submitting) return
        setFailure(null)
    
        const fieldErrors = validateResetForm(values)
        setErrors(fieldErrors)
        if (Object.keys(fieldErrors).length > 0) {
            document.getElementById(fieldErrors.newPassword ? 'reset-new-password' : 'reset-confirm-password')?.focus()
            return
        }
    
        setSubmitting(true)
        try {
            await resetPassword({ token, newPassword: values.newPassword })
            navigate('/sign-in', { replace: true, state: { passwordReset: true } })
        } catch (error) {
            if (error.code === 'invalid_token') setExpired(true)
            else if (error.status === 422 && error.details?.fieldErrors) setErrors(error.details.fieldErrors)
            else setFailure("We couldn't reset your password. Please try again.")
            setSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <h1 className="text-xl font-bold text-ink">Set a new password</h1>
            <p className="text-muted">Use at least {PASSWORD_LIMITS.min} characters.</p>
            {failure && <Alert tone="error">{failure}</Alert>}
            <TextField
                id="reset-new-password"
                label="New password"
                type="password"
                autoComplete="new-password"
                value={values.newPassword}
                onChange={handleChange('newPassword')}
                error={errors.newPassword}
            />
            <TextField
                id="reset-confirm-password"
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                value={values.confirmPassword}
                onChange={handleChange('confirmPassword')}
                error={errors.confirmPassword}
            />
            <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Saving…' : 'Reset password'}
            </Button>
        </form>
    )
}
export default ResetPasswordPage