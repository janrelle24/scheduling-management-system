import { useCallback, useState } from 'react'
import Alert from '../../ui/Alert'
import Button from '../../ui/Button'
import Modal from '../../ui/Modal'
import TextField from '../../ui/TextField'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { checkAvailability } from '../../../services/appointmentService'
import { approveRequest } from '../../../services/requestService'
import {
        formatShortDate,
        formatTimeRange,
        getManilaDateStr,
        getManilaTimeStr,
        manilaIso,
        TIMEZONE,
} from '../../../utils/datetime'

// "10:00–11:00 AM", or "Oct 28, 9:00–10:00 AM" when it is on another day than the request.
const describeSuggestion = (suggestion, date) =>
    (getManilaDateStr(suggestion.startAt) === date ? '' : `${formatShortDate(suggestion.startAt)}, `) +
    formatTimeRange(suggestion.startAt, suggestion.endAt)

  // The "Approve & confirm" dialog. Mount it only while it is open, so every opening starts
  // from the requested time:  {open && <ApproveDialog ... />}
  //   onClose()            close without changes
  //   onApproved(result)   the server confirmed it ({ notification: 'queued' | 'failed' | 'none' })
  //   onAlreadyHandled()   someone else handled the request first
  //
  // The live check below is only a PREVIEW. Confirming sends the time to the server, which
  // checks everything again: another person may have booked the time a moment ago.
function ApproveDialog({ request, onClose, onApproved, onAlreadyHandled }) {
    const [date, setDate] = useState(getManilaDateStr(request.preferredStartAt))
    const [start, setStart] = useState(getManilaTimeStr(request.preferredStartAt))
    const [end, setEnd] = useState(getManilaTimeStr(request.preferredEndAt))
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState(null)

    // Wait for a pause in editing before asking the server whether the time is free.
    const inputKey = `${date}|${start}|${end}`
    const checkedKey = useDebouncedValue(inputKey, 300)
    const [checkedDate, checkedStart, checkedEnd] = checkedKey.split('|')
    const complete = Boolean(checkedDate && checkedStart && checkedEnd)

    const load = useCallback(
        () =>
            complete
            ? checkAvailability({
                startAt: manilaIso(checkedDate, checkedStart),
                endAt: manilaIso(checkedDate, checkedEnd),
                })
            : Promise.resolve(null),
        [complete, checkedDate, checkedStart, checkedEnd],
    )
    const check = useAsyncData(load)

    const waiting = inputKey !== checkedKey || check.status === 'loading'
    const available = !waiting && check.status === 'success' && check.data?.available === true

    function applySuggestion(suggestion) {
        setDate(getManilaDateStr(suggestion.startAt))
        setStart(getManilaTimeStr(suggestion.startAt))
        setEnd(getManilaTimeStr(suggestion.endAt))
        setSaveError(null)
    }

    async function handleConfirm() {
        setSaving(true)
        setSaveError(null)
        try {
            const result = await approveRequest(request.id, {
            startAt: manilaIso(date, start),
            endAt: manilaIso(date, end),
            })
            onApproved(result)
        } catch (error) {
            if (error.code === 'not_pending') {
            onAlreadyHandled()
            } else if (error.code === 'slot_unavailable') {
            check.reload() // the live check now shows why the time was refused
            } else if (error.status === 403) {
            setSaveError("You don't have permission to approve requests.")
            } else {
            setSaveError("We couldn't confirm the appointment. Please try again.")
            }
        } finally {
            setSaving(false)
        }
    }

    const requested = `${formatShortDate(request.preferredStartAt)}, ${formatTimeRange(
        request.preferredStartAt,
        request.preferredEndAt,
    )} (${TIMEZONE})`

    return (
        <Modal
            open
            onClose={onClose}
            title="Approve & confirm"
            actions={
            <>
                <Button variant="secondary" onClick={onClose}>
                Cancel
                </Button>
                <Button onClick={handleConfirm} disabled={!available || saving}>
                {saving ? 'Confirming…' : 'Confirm appointment'}
                </Button>
            </>
            }
        >
            <p className="text-sm text-muted">Requested: {requested}</p>
    
            <TextField label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2">
            <TextField
                label="Start"
                type="time"
                step={900}
                value={start}
                onChange={(event) => setStart(event.target.value)}
            />
            <TextField
                label="End"
                type="time"
                step={900}
                value={end}
                onChange={(event) => setEnd(event.target.value)}
            />
            </div>
    
            {/* Result of the live check */}
            {!complete && inputKey === checkedKey && (
            <Alert tone="warning">Enter a date, a start time and an end time.</Alert>
            )}
            {complete && waiting && (
            <p role="status" className="text-muted">
                Checking availability…
            </p>
            )}
            {!waiting && check.status === 'error' && (
            <Alert tone="error">
                We couldn't check availability.{' '}
                <button type="button" onClick={check.reload} className="font-semibold underline">
                Try again
                </button>
            </Alert>
            )}
            {available && (
            <Alert tone="success" title="Available.">
                No conflict with confirmed appointments.
            </Alert>
            )}
            {!waiting && check.status === 'success' && check.data && !check.data.available && (
            <>
                <Alert tone="warning" title="Time not available.">
                {check.data.message} Choose another time.
                </Alert>
                {check.data.suggestions.length > 0 && (
                <div>
                    <p className="mb-2 text-sm text-muted">Next available</p>
                    <ul className="flex flex-wrap gap-2">
                    {check.data.suggestions.map((suggestion) => (
                        <li key={suggestion.startAt}>
                        <Button variant="secondary" size="sm" onClick={() => applySuggestion(suggestion)}>
                            {describeSuggestion(suggestion, date)}
                        </Button>
                        </li>
                    ))}
                    </ul>
                </div>
                )}
            </>
            )}
    
            {saveError && <Alert tone="error">{saveError}</Alert>}
    
            <p className="text-sm text-muted">
            {request.requesterEmail
                ? 'The decision is recorded with your name and time. The requester will be emailed.'
                : 'The decision is recorded with your name and time. There is no email on file, so the requester will not be notified.'}
            </p>
        </Modal>
    )
}

export default ApproveDialog