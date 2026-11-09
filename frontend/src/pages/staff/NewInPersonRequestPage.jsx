import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ButtonLink from '../../components/ui/ButtonLink'
import Card from '../../components/ui/Card'
import TextField from '../../components/ui/TextField'
import PageHeader from '../../components/PageHeader'
import DuplicateWarning from '../../components/requests/DuplicateWarning'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { getSchedulingPolicy } from '../../services/policyService'
import { createRequest, findPossibleDuplicates } from '../../services/requestService'
import { getNow } from '../../utils/clock'
import { addMinutesToTime, getManilaDateStr } from '../../utils/datetime'
import { LIMITS, STAFF_FORM_FIELDS, validateStaffRequestForm } from '../../utils/validators'

const EMPTY_VALUES = {
    fullName: '',
    phone: '',
    email: '',
    purpose: '',
    date: '',
    startTime: '',
    endTime: '',
    internalNotes: '',
}
const NOT_SAVED = 'The request was not saved. Your entries are kept. Please try again.'

// FR-08 / UC-02: staff encode a walk-in, phone or office-received request.
// Same validation and office rules as the online form; the server checks everything again.
function NewInPersonRequestPage(){
    const navigate = useNavigate()
    const [values, setValues] = useState(EMPTY_VALUES)
    const [endTouched, setEndTouched] = useState(false) // true once staff edit the end time themselves
    const [errors, setErrors] = useState({})
    const [attempted, setAttempted] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [failure, setFailure] = useState(null)
    const [serverDuplicates, setServerDuplicates] = useState(null) // from a refused save

    const today = getManilaDateStr(getNow())
    const policy = useAsyncData(getSchedulingPolicy)
    const defaultDuration = policy.data?.defaultDurationMinutes ?? 60

    // Duplicate preview: after a pause in typing, once there is a name and a date.
    // It is only a warning; saving checks again on the server.
    const { fullName, email, phone, date } = values
    const previewKey = useDebouncedValue(JSON.stringify({ fullName, email, phone, date }), 300)
    const loadDuplicates = useCallback(() => {
        const preview = JSON.parse(previewKey)
        return preview.fullName.trim().length >= 2 && preview.date
        ? findPossibleDuplicates(preview)
        : Promise.resolve(null)
    }, [previewKey])
    const preview = useAsyncData(loadDuplicates)
    const previewDuplicates =
        preview.status === 'success' && preview.data?.total > 0 ? preview.data : null
    const duplicates = serverDuplicates ?? previewDuplicates

    function focusFirstError(fieldErrors) {
        const first = STAFF_FORM_FIELDS.find((field) => fieldErrors[field])
        if (first) document.getElementById(`new-request-${first}`)?.focus()
    }

    function handleChange(field) {
        return (event) => {
            const next = { ...values, [field]: event.target.value }
            if (field === 'endTime') setEndTouched(true)
            // Until staff set the end time themselves, it follows the start time.
            if (field === 'startTime' && !endTouched) next.endTime = addMinutesToTime(next.startTime, defaultDuration)
            if (['fullName', 'email', 'phone', 'date'].includes(field)) setServerDuplicates(null)
            setValues(next)
            // After the first Save click, errors update as they are corrected.
            if (attempted) setErrors(validateStaffRequestForm(next, getNow()))
        }
    }

    async function handleSubmit(event) {
        event.preventDefault()
        if (submitting) return
        setAttempted(true)
        setFailure(null)
    
        const fieldErrors = validateStaffRequestForm(values, getNow())
        setErrors(fieldErrors)
        if (Object.keys(fieldErrors).length > 0) {
            focusFirstError(fieldErrors)
            return
        }
    
        setSubmitting(true)
        try {
            const result = await createRequest(values, { acknowledgeDuplicate: Boolean(duplicates) })
            navigate(`/requests/${result.id}`, {
                state: {
                created: {
                    referenceNumber: result.referenceNumber,
                    timeMayBeUnavailable: result.timeMayBeUnavailable,
                    emailOnFile: result.emailOnFile,
                },
                },
            })
        } catch (error) {
            if (error.status === 422) {
                const serverErrors = error.details?.fieldErrors ?? {}
                setErrors(serverErrors)
                focusFirstError(serverErrors)
                setFailure({ tone: 'error', message: 'Please correct the highlighted fields.' })
            } else if (error.status === 409 && error.code === 'possible_duplicate') {
                setServerDuplicates(error.details.duplicates) // shows the warning; Save becomes "Save anyway"
            } else if (error.status === 403) {
                setFailure({ tone: 'error', message: "You don't have permission to encode requests." })
            } else {
                setFailure({ tone: 'error', message: NOT_SAVED })
            }
        } finally {
            setSubmitting(false)
        }
    }
    return (
        <div className="flex max-w-3xl flex-col gap-6">
            <PageHeader
                title="New In-Person Request"
                subtitle="Encode a walk-in, phone or office-received request"
                action={<Badge>Source: In-person</Badge>}
            />
    
            <Card>
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                    id="new-request-fullName"
                    label="Full name"
                    required
                    autoComplete="off"
                    maxLength={LIMITS.nameMax}
                    value={values.fullName}
                    onChange={handleChange('fullName')}
                    error={errors.fullName}
                    />
                    <TextField
                    id="new-request-phone"
                    label="Phone"
                    type="tel"
                    autoComplete="off"
                    value={values.phone}
                    onChange={handleChange('phone')}
                    error={errors.phone}
                    />
                </div>
                <TextField
                    id="new-request-email"
                    label="Email"
                    type="email"
                    autoComplete="off"
                    placeholder="Optional if phone is given"
                    hint="Provide at least an email or a phone number. Without an email, no notifications are sent."
                    value={values.email}
                    onChange={handleChange('email')}
                    error={errors.email}
                />
                <TextField
                    id="new-request-purpose"
                    label="Purpose"
                    required
                    maxLength={LIMITS.purposeMax}
                    value={values.purpose}
                    onChange={handleChange('purpose')}
                    error={errors.purpose}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                    <TextField
                    id="new-request-date"
                    label="Preferred date"
                    type="date"
                    min={today}
                    aria-required="true"
                    value={values.date}
                    onChange={handleChange('date')}
                    error={errors.date}
                    />
                    <TextField
                    id="new-request-startTime"
                    label="Start"
                    type="time"
                    step={900}
                    aria-required="true"
                    value={values.startTime}
                    onChange={handleChange('startTime')}
                    error={errors.startTime}
                    />
                    <TextField
                    id="new-request-endTime"
                    label="End"
                    type="time"
                    step={900}
                    aria-required="true"
                    value={values.endTime}
                    onChange={handleChange('endTime')}
                    error={errors.endTime}
                    />
                </div>
                <TextField
                    id="new-request-internalNotes"
                    label="Internal notes"
                    placeholder="Visible to staff only"
                    maxLength={LIMITS.notesMax}
                    value={values.internalNotes}
                    onChange={handleChange('internalNotes')}
                    error={errors.internalNotes}
                />
        
                {duplicates && <DuplicateWarning duplicates={duplicates} />}
                {failure && <Alert tone={failure.tone}>{failure.message}</Alert>}
        
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <ButtonLink to="/requests" variant="secondary">
                    Cancel
                    </ButtonLink>
                    <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving…' : duplicates ? 'Save anyway' : 'Save request'}
                    </Button>
                </div>
                </form>
            </Card>
        </div>
    )
}
export default NewInPersonRequestPage




