import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import TextLink from '../../components/ui/TextLink'
import { forgotPassword } from '../../services/authService'
import { validateForgotPassword } from '../../utils/validators'

// "Forgot password" and, after sending, "Check your email" (same page, no new address).
// The answer never says whether the account exists (FR-03, no account discovery).
function ForgotPasswordPage(){
    const location = useLocation()
    const [email, setEmail] = useState(location.state?.email ?? '') // carried over from the sign-in form
    const [error, setError] = useState(undefined)
    const [failure, setFailure] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [sent, setSent] = useState(null) // { devResetToken? } once the request went through

    async function handleSubmit(event) {
        event.preventDefault()
        if (submitting) return
        setFailure(null)
        const fieldErrors = validateForgotPassword({ email })
        setError(fieldErrors.email)
        if (fieldErrors.email) {
            document.getElementById('forgot-email')?.focus()
            return
        }
    
        setSubmitting(true)
        try {
            setSent(await forgotPassword({ email: email.trim() }))
            } catch (serverError) {
            if (serverError.status === 422) setError(serverError.details?.fieldErrors?.email)
            else setFailure("We couldn't send the link. Please try again.")
            } finally {
            setSubmitting(false)
        }
    }

    if (sent) {
        return (
            <div className="flex flex-col gap-4">
                <h1 className="text-xl font-bold text-ink">Check your email</h1>
                <p className="text-muted">If an account exists for that address, a reset link is on its way.</p>
                <Alert tone="success">Link sent</Alert>
                {sent.devResetToken && (
                <div className="rounded-lg border border-pending-border bg-pending-bg p-3 text-sm text-pending-fg">
                    <p className="font-semibold">DEV ONLY: no email is sent.</p>
                    <p className="mt-1">
                    In the real system this link arrives by email.{' '}
                    <Link
                        to={`/reset-password?token=${encodeURIComponent(sent.devResetToken)}`}
                        className="font-semibold underline"
                    >
                        Open the reset link
                    </Link>
                    </p>
                </div>
                )}
                <TextLink to="/sign-in" className="self-start">
                Back to sign in
                </TextLink>
            </div>
        )
    }
    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <h1 className="text-xl font-bold text-ink">Forgot password</h1>
            <p className="text-muted">Enter your work email. We'll send a reset link.</p>
            {failure && <Alert tone="error">{failure}</Alert>}
            <TextField
                id="forgot-email"
                label="Email"
                type="email"
                inputMode="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={error}
            />
            <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Sending…' : 'Send reset link'}
            </Button>
            <TextLink to="/sign-in" className="self-center">
                Back to sign in
            </TextLink>
        </form>
    )
}
export default ForgotPasswordPage