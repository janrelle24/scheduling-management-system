import { useState } from 'react'
import Alert from '../../ui/Alert'
import Button from '../../ui/Button'
import Modal from '../../ui/Modal'
import SlotFields from './SlotFields'
import { describeStale, STALE_CODES } from './actionMessages'
import { useSlotPicker } from '../../../hooks/useSlotPicker'
import { rescheduleAppointment } from '../../../services/appointmentService'
import { formatShortDate, formatTimeRange } from '../../../utils/datetime'

// The "Reschedule" dialog (mount it only while open). Starts at the appointment's current time,
// which is not accepted as the new time. The current time stays reserved until the server has
// secured the new one, so a refused move leaves the appointment exactly as it was.
function RescheduleDialog({ request, onClose, onDone, onStale }){
    const { appointment } = request
    const picker = useSlotPicker({
        initialStartAt: appointment.startAt,
        initialEndAt: appointment.endAt,
        excludeAppointmentId: appointment.id,
        currentStartAt: appointment.startAt,
        currentEndAt: appointment.endAt,
    })
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState(null)

    async function handleConfirm() {
        setSaving(true)
        setSaveError(null)
        try {
            onDone(await rescheduleAppointment(appointment.id, { startAt: picker.startAt, endAt: picker.endAt }))
        } catch (error) {
            if (STALE_CODES.includes(error.code)) {
                onStale(describeStale(error))
            } else if (error.code === 'slot_unavailable') {
                picker.check.reload()
            } else if (error.status === 403) {
                setSaveError("You don't have permission to reschedule appointments.")
            } else if (error.code === 'no_change') {
                setSaveError('That is already the current time. Choose a new time.')
            } else {
                setSaveError("We couldn't reschedule the appointment. Please try again.")
            }
        } finally {
            setSaving(false)
        }
    }
    return (
        <Modal
            open
            onClose={onClose}
            title="Reschedule"
            actions={
                <>
                <Button variant="secondary" onClick={onClose}>
                    Keep as is
                </Button>
                <Button onClick={handleConfirm} disabled={!picker.available || saving}>
                    {saving ? 'Rescheduling…' : 'Reschedule'}
                </Button>
                </>
            }
        >
            <p className="text-muted">Current time stays reserved until the new time is secured.</p>
            <p className="text-sm text-muted">
                Current: {formatShortDate(appointment.startAt)}, {formatTimeRange(appointment.startAt, appointment.endAt)}
            </p>
            <SlotFields picker={picker} labels={{ date: 'New date', start: 'New start', end: 'New end' }} />
            {saveError && <Alert tone="error">{saveError}</Alert>}
            <p className="text-sm text-muted">
                {request.requesterEmail
                    ? 'The change is recorded with your name and time. The requester will be emailed the new time.'
                    : 'The change is recorded with your name and time. There is no email on file, so the requester will not be notified.'}
            </p>
        </Modal>
    )
}
export default RescheduleDialog