import { useState } from 'react'
import Alert from '../../ui/Alert'
import Button from '../../ui/Button'
import Modal from '../../ui/Modal'
import SlotFields from './SlotFields'
//import TextField from '../../ui/TextField'
import { describeStale, STALE_CODES } from './actionMessages'
import { useSlotPicker } from '../../../hooks/useSlotPicker'
//import { useAsyncData } from '../../../hooks/useAsyncData'
//import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
//import { checkAvailability } from '../../../services/appointmentService'
import { approveRequest } from '../../../services/requestService'
import { formatShortDate, formatTimeRange, TIMEZONE } from '../../../utils/datetime'


// The "Approve & confirm" dialog. Mount it only while it is open, so every opening starts
// from the requested time:  {open && <ApproveDialog ... />}
//   onClose()          close without changes
//   onDone(result)     the server confirmed it ({ notification: 'queued' | 'failed' | 'none' })
//   onStale(message)   someone else handled the request first
//
// The live check is only a PREVIEW. Confirming sends the time to the server, which checks
// everything again: another person may have booked the time a moment ago.
export default function ApproveDialog({ request, onClose, onDone, onStale }) {
    const picker = useSlotPicker({
        initialStartAt: request.preferredStartAt,
        initialEndAt: request.preferredEndAt,
    })
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState(null)

    async function handleConfirm() {
        setSaving(true)
        setSaveError(null)
        try {
            onDone(await approveRequest(request.id, { startAt: picker.startAt, endAt: picker.endAt }))
        } catch (error) {
            if (STALE_CODES.includes(error.code)) {
            onStale(describeStale(error))
            } else if (error.code === 'slot_unavailable') {
            picker.check.reload() // the live check now shows why the time was refused
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
                <Button onClick={handleConfirm} disabled={!picker.available || saving}>
                {saving ? 'Confirming…' : 'Confirm appointment'}
                </Button>
            </>
            }
        >
            <p className="text-sm text-muted">Requested: {requested}</p>
            <SlotFields picker={picker} />
            {saveError && <Alert tone="error">{saveError}</Alert>}
            <p className="text-sm text-muted">
            {request.requesterEmail
                ? 'The decision is recorded with your name and time. The requester will be emailed.'
                : 'The decision is recorded with your name and time. There is no email on file, so the requester will not be notified.'}
            </p>
        </Modal>
    )
}
