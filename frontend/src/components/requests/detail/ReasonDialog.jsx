import { useState } from 'react'
import Alert from '../../ui/Alert'
import Button from '../../ui/Button'
import Modal from '../../ui/Modal'
import TextField from '../../ui/TextField'
import { describeStale, STALE_CODES } from './actionMessages'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { getSchedulingPolicy } from '../../../services/policyService'

// One dialog for "Reject request" and "Cancel appointment": a reason and a red confirm button.
// Mount it only while open.
//   submit(reason)   calls the service and returns its promise
//   onDone(result)   the server did it     onStale(message)   someone else got there first
// Whether a reason is required comes from the office policy. Until it is known, or if it
// cannot be loaded, the dialog assumes it IS required (the safe choice); the server decides.

function ReasonDialog({
    title,
    description,
    confirmLabel,
    savingLabel,
    submit,
    onClose,
    onDone,
    onStale,
}){
    const policy = useAsyncData(getSchedulingPolicy)
    const requireReason = policy.status === 'success' ? policy.data.requireReason : true
    const [reason, setReason] = useState('')
    const [fieldError, setFieldError] = useState(undefined)
    const [saveError, setSaveError] = useState(null)
    const [saving, setSaving] = useState(false)

    async function handleConfirm() {
        const text = reason.trim()
        if(requireReason && !text){
            setFieldError('Enter a reason.')
            return
        }
        setSaving(true)
        setSaveError(null)
        setFieldError(undefined)
        try{
            onDone(await submit(text))
        }catch(error){
            if (STALE_CODES.includes(error.code)) {
                onStale(describeStale(error))
            } else if (error.status === 422 && error.details?.fieldErrors?.reason) {
                setFieldError(error.details.fieldErrors.reason)
            } else if (error.status === 403) {
                setSaveError("You don't have permission to do that.")
            } else {
                setSaveError("We couldn't complete that. Please try again.")
            }
        }finally{
            setSaving(false)
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={title}
            actions={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        Keep as is
                    </Button>
                    <Button variant="danger" onClick={handleConfirm} disabled={saving || policy.status === 'loading'}>
                        {saving ? savingLabel : confirmLabel}
                    </Button>
                </>
            }
        >
            <p className="text-muted">{description}</p>
            <TextField
                label="Reason"
                required={requireReason}
                placeholder="Explain the decision"
                maxLength={500}
                value={reason}
                error={fieldError}
                onChange={(event) => {
                setReason(event.target.value)
                setFieldError(undefined)
                }}
            />
            {saveError && <Alert tone="error">{saveError}</Alert>}
        </Modal>
    )
}
export default ReasonDialog