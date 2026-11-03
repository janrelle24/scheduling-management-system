import { useEffect, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import ButtonLink from '../../components/ui/ButtonLink'
import Card from '../../components/ui/Card'
import { useToast } from '../../hooks/useToast'
import { formatDateTime } from '../../utils/datetime'

// The result is handed over by the form through the router's navigation state
// (nothing is stored in the browser). A direct visit has no result, so it goes back to the form.
function RequestSubmittedPage() {
    const result = useLocation().state?.result
    const toast = useToast()
    const headingRef = useRef(null)

    useEffect(() => {
        headingRef.current?.focus() // lets screen readers start at the new page
    }, [])

    if (!result) return <Navigate to="/request" replace />

    async function handleCopy() {
        try {
        await navigator.clipboard.writeText(result.referenceNumber)
        toast.show({ tone: 'success', message: 'Reference number copied.' })
        } catch {
        toast.show({ tone: 'error', message: 'Could not copy. Please select the number and copy it yourself.' })
        }
    }

    return (
        <div className="flex flex-col gap-5">
        <Alert tone="success" title="Request received.">
            Your request has been submitted.
        </Alert>

        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold text-ink outline-none">
            Your reference number
        </h1>

        <Card>
            <p className="text-center font-mono text-2xl font-bold text-ink">{result.referenceNumber}</p>
            <Button variant="secondary" onClick={handleCopy} className="mt-4 w-full">
            Copy reference number
            </Button>
        </Card>

        <p className="text-ink">Keep this number for follow-up with the office.</p>

        <Alert tone="warning">
            Your preferred time ({formatDateTime(result.preferredStartAt)}) is{' '}
            <strong className="font-bold">not yet reserved</strong>. It is confirmed only when the office
            approves it.
            {result.timeMayBeUnavailable &&
            ' Another appointment may already be scheduled around this time, so the office may suggest a different time.'}
        </Alert>

        {result.acknowledgement === 'queued' ? (
            <p className="text-muted">
            An acknowledgement email is being sent to {result.requesterEmail}. You'll be emailed the
            decision.
            </p>
        ) : (
            <p className="text-muted">
            You didn't provide an email, so we can't send updates. Keep your reference number and
            contact the office for follow-up.
            </p>
        )}

        <ButtonLink to="/request" variant="secondary" className="w-full">
            Submit another request
        </ButtonLink>
        </div>
    )
}

export default RequestSubmittedPage