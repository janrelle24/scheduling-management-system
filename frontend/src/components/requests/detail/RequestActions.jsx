import { useState } from 'react'
import Button from '../../ui/Button'
import ApproveDialog from './ApproveDialog'
import ReasonDialog from './ReasonDialog'
import RescheduleDialog from './RescheduleDialog'
import { outcomeToast } from './actionMessages'
import { useSession } from '../../../hooks/useSession'
import { useToast } from '../../../hooks/useToast'
import { cancelAppointment } from '../../../services/appointmentService'
import { rejectRequest } from '../../../services/requestService'
import { getNow } from '../../../utils/clock'
import { formatShortDate, formatTimeRange } from '../../../utils/datetime'
import { PERMISSIONS } from '../../../utils/permissions'

const NO_EMAIL = 'There is no email on file, so the requester will not be notified.'

// The buttons in the page header and the dialog each one opens.
//   pending request              -> Reject, Approve & confirm
//   confirmed, not yet ended     -> Reschedule, Cancel appointment
// A button without permission is shown disabled with a note, as in the design. That is only
// a hint: the server checks the permission again on every action.
//   onChanged()  called after something changed, so the page reloads the latest record

function RequestActions( { request, onChanged}){
    const { can } = useSession()
    const toast = useToast()
    const [dialog, setDialog] = useState(null) // 'approve' | 'reject' | 'cancel' | 'reschedule' | null

    const { appointment } = request
    const pending = request.displayStatus === 'pending'
    const confirmed = request.displayStatus === 'confirmed' && appointment?.status === 'confirmed'
    const ended = confirmed && new Date(appointment.endAt) <= getNow()
    const close = () => setDialog(null)

    function done(action) {
        return (result) => {
            setDialog(null)
            toast.show(outcomeToast(action, result.notification))
            onChanged()
        }
    }
    function stale({ title, message }) {
        setDialog(null)
        toast.show({ tone: 'warning', title, message })
        onChanged()
    }
    if (!pending && !confirmed) return null

    // [label, variant, permission, permission wording for the note, dialog]
    const buttons = pending
    ? [
        ['Reject', 'dangerOutline', PERMISSIONS.APPOINTMENTS_REJECT, 'rejection', 'reject'],
        ['Approve & confirm', 'primary', PERMISSIONS.APPOINTMENTS_APPROVE, 'approval', 'approve'],
        ]
    : ended
        ? []
        : [
            ['Reschedule', 'secondary', PERMISSIONS.APPOINTMENTS_RESCHEDULE, 'reschedule', 'reschedule'],
            ['Cancel appointment', 'dangerOutline', PERMISSIONS.APPOINTMENTS_CANCEL, 'cancellation', 'cancel'],
        ]
    const missing = buttons.filter(([, , permission]) => !can(permission))

    return (
        <div className="flex max-w-md flex-col gap-2 sm:items-end">
            {buttons.length > 0 && (
                <div className="flex flex-wrap gap-3">
                {buttons.map(([label, variant, permission, , name]) => (
                    <Button
                    key={name}
                    variant={variant}
                    disabled={!can(permission)}
                    aria-describedby={missing.length > 0 ? 'action-help' : undefined}
                    onClick={() => setDialog(name)}
                    >
                    {label}
                    </Button>
                ))}
                </div>
            )}
            {missing.length > 0 && (
                <p id="action-help" className="text-sm text-muted sm:text-right">
                {missing.map(([, , , wording]) => `Requires ${wording} permission.`).join(' ')} The server checks this
                on every action.
                </p>
            )}
            {ended && (
                <p className="text-sm text-muted sm:text-right">
                This appointment has already ended, so it can’t be rescheduled or cancelled.
                </p>
            )}
        
            {dialog === 'approve' && (
                <ApproveDialog request={request} onClose={close} onDone={done('approve')} onStale={stale} />
            )}
            {dialog === 'reject' && (
                <ReasonDialog
                title="Reject request"
                description={`${request.referenceNumber} · ${request.requesterName}. ${
                    request.requesterEmail ? 'The requester is emailed the decision.' : NO_EMAIL
                }`}
                confirmLabel="Reject request"
                savingLabel="Rejecting…"
                submit={(reason) => rejectRequest(request.id, { reason })}
                onClose={close}
                onDone={done('reject')}
                onStale={stale}
                />
            )}
            {dialog === 'cancel' && (
                <ReasonDialog
                title="Cancel appointment"
                description={`${formatShortDate(appointment.startAt)}, ${formatTimeRange(
                    appointment.startAt,
                    appointment.endAt,
                )}. This releases the time slot.${request.requesterEmail ? '' : ` ${NO_EMAIL}`}`}
                confirmLabel="Cancel appointment"
                savingLabel="Cancelling…"
                submit={(reason) => cancelAppointment(appointment.id, { reason })}
                onClose={close}
                onDone={done('cancel')}
                onStale={stale}
                />
            )}
            {dialog === 'reschedule' && (
                <RescheduleDialog request={request} onClose={close} onDone={done('reschedule')} onStale={stale} />
            )}
        </div>
    )
}
export default RequestActions