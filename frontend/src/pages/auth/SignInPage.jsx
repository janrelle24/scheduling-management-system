import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import TextField from '../../components/ui/TextField'
import TextLink from '../../components/ui/TextLink'
import DemoNotice from '../../components/DemoNotice'
import { useSession } from '../../hooks/useSession'
import { DEMO_PASSWORD, SHOW_DEV_HELPERS } from '../../services/authService'
import { db } from '../../data/store'
import { validateSignIn } from '../../utils/validators'

// Where to go after signing in: the page the person was trying to open, else the Dashboard.
// It only ever comes from our own StaffLayout redirect, and must stay on this site.
function getDestination(location) {
    const from = location.state?.from
    const path = from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/dashboard'
    return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/sign-in') ? path : '/dashboard'
}

// DEVELOPMENT ONLY (hidden in production builds): the demo accounts and their shared password.
function DevHint() {
    return (
        <div className="rounded-lg border border-pending-border bg-pending-bg p-4 text-sm text-pending-fg">
            <p className="font-semibold">DEV ONLY: simulated sign-in, not real authentication.</p>
            <p className="mt-1">
            Every demo account uses the password <code className="font-mono">{DEMO_PASSWORD}</code> (until a reset
            changes it).
            </p>
            <ul className="mt-1 list-disc pl-5">
            {db.users.map((user) => (
                <li key={user.id}>
                <span className="font-mono">{user.email}</span> ({user.role}
                {user.isActive ? '' : ', deactivated'})
                </li>
            ))}
            </ul>
        </div>
    )
}

function SignInPage(){
    const { user, signIn } = useSession()
    const location = useLocation()
    const [values, setValues] = useState({ email: '', password: '' })
    const [errors, setErrors] = useState({})
    const [failure, setFailure] = useState(null)
    const [submitting, setSubmitting] = useState(false)

    // Already signed in (or just signed in): go on to the destination.
    if (user) return <Navigate to={getDestination(location)} replace />

    const passwordWasReset = Boolean(location.state?.passwordReset)

    function handleChange(field) {
        return (event) => setValues((current) => ({ ...current, [field]: event.target.value }))
    }

    async function handleSubmit(event) {
        event.preventDefault()
        if (submitting) return
        setFailure(null)
    
        const fieldErrors = validateSignIn(values)
        setErrors(fieldErrors)
        if (Object.keys(fieldErrors).length > 0) {
            document.getElementById(fieldErrors.email ? 'sign-in-email' : 'sign-in-password')?.focus()
            return
        }
    
        setSubmitting(true)
        try {
          await signIn(values.email.trim(), values.password) // success: this page re-renders with a user
        } catch (error) {
          setValues((current) => ({ ...current, password: '' })) // keep the email, clear the password
            if (error.status === 401) setFailure('Incorrect email or password. Try again.')
            else setFailure("We couldn't sign you in. Please try again.")
            setSubmitting(false)
            document.getElementById('sign-in-password')?.focus()
        }
    }

    return (
        <div className="min-h-screen lg:grid lg:grid-cols-2">
            <section className="bg-brand px-6 py-8 text-white lg:flex lg:flex-col lg:justify-center lg:px-16 lg:py-0">
                <p className="text-lg font-semibold">Office of the Vice Mayor</p>
                <h2 className="mt-2 max-w-md text-2xl font-bold lg:mt-4 lg:text-4xl">Appointments and schedule, in one place.</h2>
                <p className="mt-2 text-base lg:mt-4 lg:text-lg">For authorized office staff and administrators only.</p>
            </section>
        
            <div className="bg-page">
                <DemoNotice />
                <main id="main" className="mx-auto flex max-w-md flex-col gap-4 px-5 py-8 lg:py-24">
                <Card>
                    <h1 className="mb-4 text-xl font-bold text-ink">Sign in</h1>
                    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                    {passwordWasReset && !failure && (
                        <Alert tone="success">Password updated. Sign in with your new password.</Alert>
                    )}
                    {failure && <Alert tone="error">{failure}</Alert>}
                    <TextField
                        id="sign-in-email"
                        label="Email"
                        type="email"
                        inputMode="email"
                        autoComplete="username"
                        value={values.email}
                        onChange={handleChange('email')}
                        error={errors.email}
                    />
                    <TextField
                        id="sign-in-password"
                        label="Password"
                        type="password"
                        autoComplete="current-password"
                        value={values.password}
                        onChange={handleChange('password')}
                        error={errors.password}
                    />
                    <Button type="submit" disabled={submitting} className="w-full">
                        {submitting ? 'Signing in…' : 'Sign in'}
                    </Button>
                    <p className="text-center">
                        <TextLink to="/forgot-password" state={{ email: values.email }}>
                        Forgot password?
                        </TextLink>
                    </p>
                    </form>
                </Card>
                {SHOW_DEV_HELPERS && <DevHint />}
                </main>
            </div>
        </div>
    )
}
export default SignInPage