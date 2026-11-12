import { useState } from 'react'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { setUserActive } from '../../services/userService'

// "Can't deactivate this account": the last-administrator rule (UC-07). Mount only while shown.
export function BlockedDialog({ title, message, onClose }) {
    return (
        <Modal open onClose={onClose} title={title} actions={<Button onClick={onClose}>OK</Button>}>
            <p className="text-muted">{message}</p>
            <Alert tone="error">At least one administrator must stay active.</Alert>
        </Modal>
    )
}

// Asks before deactivating. A deactivated person cannot sign in; their history is kept.
//   onDone(account)      it worked
//   onBlocked(error)     the last-administrator rule refused it
export function DeactivateDialog({ account, isOwnAccount, onClose, onDone, onBlocked }){
    const [saving, setSaving] = useState(false)
    const [failure, setFailure] = useState(null)

    async function handleConfirm() {
        setSaving(true)
        setFailure(null)
        try {
            const { user } = await setUserActive(account.id, false)
            onDone(user)
        } catch (error) {
            if (error.code === 'last_administrator') onBlocked(error)
            else if (error.status === 403) setFailure("You don't have permission to manage accounts.")
            else setFailure("We couldn't deactivate the account. Please try again.")
        } finally {
            setSaving(false)
        }
    }
    return (
        <Modal
            open
            onClose={onClose}
            title={`Deactivate ${account.fullName}?`}
            actions={
                <>
                <Button variant="secondary" onClick={onClose}>
                    Keep active
                </Button>
                <Button variant="danger" onClick={handleConfirm} disabled={saving}>
                    {saving ? 'Deactivating…' : 'Deactivate'}
                </Button>
                </>
            }
            >
            <p className="text-muted">They will not be able to sign in. Their history is kept, and you can activate the account again.</p>
            {isOwnAccount && <Alert tone="warning">This is your own account. You will be signed out.</Alert>}
            {failure && <Alert tone="error">{failure}</Alert>}
        </Modal>
    )
}