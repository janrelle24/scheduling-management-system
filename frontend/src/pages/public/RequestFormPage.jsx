import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import TextField from '../../components/ui/TextField'
import { submitRequest } from '../../services/publicRequestService'
import { ApiError } from '../../services/ApiError'
import { getNow } from '../../utils/clock'
import { getManilaDateStr } from '../../utils/datetime'
import { FORM_FIELDS, LIMITS, validateRequestForm } from '../../utils/validators'

const EMPTY_VALUES = { fullName: '', email: '', phone: '', purpose: '', date: '', startTime: '' }
const GENERIC_FAILURE = "We couldn't submit your request. Your details were not saved. Please try again."

// What to tell the person for each kind of server failure (never a false success).
function describeFailure(error) {
    if (error instanceof ApiError) {
        if (error.status === 422) return { tone: 'error', message: 'Please correct the highlighted fields.' }
        if (error.status === 409) {
        return {
            tone: 'warning',
            message: 'We already received a request with these details. Check your email for the acknowledgement.',
        }
        }
        if (error.status === 429) {
        return { tone: 'error', message: 'Too many requests. Please wait a few minutes and try again.' }
        }
    }
    return { tone: 'error', message: GENERIC_FAILURE }
}

function RequestFormPage() {
    const navigate = useNavigate()
    const [values, setValues] = useState(EMPTY_VALUES)
    const [errors, setErrors] = useState({})
    const [attempted, setAttempted] = useState(false) // true after the first Submit click
    const [submitting, setSubmitting] = useState(false)
    const [failure, setFailure] = useState(null)

    const today = getManilaDateStr(getNow())

    function focusFirstError(fieldErrors) {
        const first = FORM_FIELDS.find((field) => fieldErrors[field])
        if (first) document.getElementById(`request-${first}`)?.focus()
    }

    function handleChange(field) {
        return (event) => {
        const next = { ...values, [field]: event.target.value }
        setValues(next)
        // After the first Submit click, errors update as the person corrects them.
        if (attempted) setErrors(validateRequestForm(next, getNow()))
        }
    }

    async function handleSubmit(event) {
        event.preventDefault()
        if (submitting) return
        setAttempted(true)
        setFailure(null)

        const fieldErrors = validateRequestForm(values, getNow())
        setErrors(fieldErrors)
        if (Object.keys(fieldErrors).length > 0) {
        focusFirstError(fieldErrors)
        return
        }

        setSubmitting(true)
        try {
        const result = await submitRequest(values)
        navigate('/request/submitted', { state: { result } })
        } catch (error) {
        if (error instanceof ApiError && error.status === 422) {
            const serverErrors = error.details?.fieldErrors ?? {}
            setErrors(serverErrors)
            focusFirstError(serverErrors)
        }
        setFailure(describeFailure(error))
        } finally {
        setSubmitting(false)
        }
    }

    return (
        <>
        <h1 className="text-3xl font-bold text-ink">Request an appointment</h1>
        <p className="mt-3 text-base text-muted">
            No account needed. Your preferred time is a request, not a reservation, until the office
            confirms.
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
            <TextField
            id="request-fullName"
            label="Full name"
            autoComplete="name"
            aria-required="true"
            maxLength={LIMITS.nameMax}
            value={values.fullName}
            onChange={handleChange('fullName')}
            error={errors.fullName}
            />
            <TextField
            id="request-email"
            label="Email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange('email')}
            error={errors.email}
            />
            <TextField
            id="request-phone"
            label="Phone"
            type="tel"
            autoComplete="tel"
            value={values.phone}
            onChange={handleChange('phone')}
            error={errors.phone}
            />
            <TextField
            id="request-purpose"
            label="Purpose"
            aria-required="true"
            maxLength={LIMITS.purposeMax}
            value={values.purpose}
            onChange={handleChange('purpose')}
            error={errors.purpose}
            />
            <div className="grid grid-cols-2 gap-4">
            <TextField
                id="request-date"
                label="Date"
                type="date"
                min={today}
                aria-required="true"
                value={values.date}
                onChange={handleChange('date')}
                error={errors.date}
            />
            <TextField
                id="request-startTime"
                label="Start time"
                type="time"
                step={900}
                aria-required="true"
                value={values.startTime}
                onChange={handleChange('startTime')}
                error={errors.startTime}
            />
            </div>

            <p className="text-sm text-muted">
            We collect only what is needed to process your request, per the Data Privacy Act.
            </p>

            {failure && <Alert tone={failure.tone}>{failure.message}</Alert>}

            <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Submitting…' : 'Submit request'}
            </Button>
        </form>
        </>
    )
}

export default RequestFormPage