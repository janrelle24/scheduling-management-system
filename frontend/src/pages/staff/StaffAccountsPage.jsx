import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import ErrorState from '../../components/ui/ErrorState'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import AccountForm from '../../components/accounts/AccountForm'
import { BlockedDialog, DeactivateDialog } from '../../components/accounts/AccountDialogs'
import AccountList from '../../components/accounts/AccountList'
import PageHeader from '../../components/PageHeader'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useSession } from '../../hooks/useSession'
import { useToast } from '../../hooks/useToast'
import { createUser, listUsers, setUserActive, updateUser } from '../../services/userService'

// The blocking dialog's title depends on what was refused.
const blockedTitle = (error) =>
    error.details?.action === 'change_role' ? "Can't change this account's role" : "Can't deactivate this account"

// The screen after the list has loaded. It keeps its own copy of the accounts and updates it
// from what each service call returns, so the edit panel stays open and keeps its place.
function Workspace({ initialAccounts }) {
    const { user: me, signOut, refreshSession } = useSession()
    const toast = useToast()
    const [accounts, setAccounts] = useState(initialAccounts)
    const [selectedId, setSelectedId] = useState(null)
    const [creating, setCreating] = useState(false)
    const [deactivating, setDeactivating] = useState(null) // the account being confirmed
    const [blocked, setBlocked] = useState(null) // { title, message }
    const [devInvite, setDevInvite] = useState(null) // development builds only: no email is sent
    const headingRef = useRef(null)

    const selected = accounts.find((account) => account.id === selectedId)

    // Opening Edit moves focus to the panel, so keyboard and screen-reader users land on it.
    useEffect(() => {
        if (selectedId) headingRef.current?.focus()
    }, [selectedId])

    const replace = (saved) => setAccounts((list) => list.map((account) => (account.id === saved.id ? saved : account)))

    // If an administrator changed their OWN account, re-read it so the menus match.
    const afterOwnChange = (saved) => {
        if (saved.id === me.id) refreshSession()
    }

    async function saveEdit(values) {
        const { user: saved, changed } = await updateUser(selected.id, {
            fullName: values.fullName,
            role: values.role,
            permissions: values.permissions,
        })
        replace(saved)
        afterOwnChange(saved)
        toast.show(
            changed
            ? { tone: 'success', title: 'Account saved.', message: 'The change is recorded in the audit log.' }
            : { tone: 'success', title: 'Nothing to save.', message: 'The account was already like this.' },
        )
    }

    async function saveNew(values) {
        const result = await createUser(values)
        setAccounts((list) => [...list, result.user])
        setCreating(false)
        setSelectedId(null)
        setDevInvite(result.devInviteToken ? { name: result.user.fullName, token: result.devInviteToken } : null)
        toast.show({ tone: 'success', title: 'Account created.', message: 'Invitation email queued.' })
    }

    async function activate(account) {
        try {
            const { user: saved } = await setUserActive(account.id, true)
            replace(saved)
            toast.show({ tone: 'success', title: 'Account activated.', message: `${saved.fullName} can sign in again.` })
        } catch {
            toast.show({ tone: 'warning', title: 'Not saved.', message: "We couldn't activate the account. Please try again." })
        }
    }

    function deactivated(saved) {
        replace(saved)
        setDeactivating(null)
        toast.show({ tone: 'success', title: 'Account deactivated.', message: `${saved.fullName} can no longer sign in.` })
        if (saved.id === me.id) signOut() // the person just ended their own access
    }

    const showBlocked = (error) => {
        setDeactivating(null)
        setBlocked({ title: blockedTitle(error), message: error.message })
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
            title="Staff Accounts"
            subtitle="Create accounts and assign permissions"
            action={<Button onClick={() => setCreating(true)}>+ Add staff account</Button>}
            />
    
            {devInvite && (
            <Alert tone="warning" title="DEV ONLY: no email is sent.">
                In the real system {devInvite.name} receives this link by email.{' '}
                <Link to={`/reset-password?token=${encodeURIComponent(devInvite.token)}`} className="font-semibold underline">
                Open the invitation link
                </Link>
            </Alert>
            )}
    
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
            <Card flush>
                <AccountList accounts={accounts} selectedId={selectedId} onEdit={setSelectedId} />
            </Card>
    
            <Card>
                {selected ? (
                <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-ink">
                        Edit: {selected.fullName}
                    </h2>
                    {!selected.isActive && <span className="text-sm font-semibold text-muted">Inactive</span>}
                    </div>
                    <p className="-mt-2 mb-4 text-sm break-all text-muted">{selected.email}</p>
                    <AccountForm
                    key={selected.id}
                    mode="edit"
                    account={selected}
                    idPrefix="edit-account"
                    submitLabel="Save changes"
                    savingLabel="Saving…"
                    onSubmit={saveEdit}
                    onBlocked={showBlocked}
                    leftAction={
                        selected.isActive ? (
                        <Button variant="dangerOutline" onClick={() => setDeactivating(selected)}>
                            Deactivate
                        </Button>
                        ) : (
                        <Button variant="secondary" onClick={() => activate(selected)}>
                            Activate
                        </Button>
                        )
                    }
                    />
                </>
                ) : (
                <p className="text-muted">Choose Edit on an account to change its details and permissions.</p>
                )}
            </Card>
            </div>
    
            {creating && (
            <Modal open onClose={() => setCreating(false)} title="Add staff account">
                <AccountForm
                mode="create"
                idPrefix="new-account"
                submitLabel="Create account"
                savingLabel="Creating…"
                onSubmit={saveNew}
                leftAction={
                    <Button variant="secondary" onClick={() => setCreating(false)}>
                    Cancel
                    </Button>
                }
                />
            </Modal>
            )}
    
            {deactivating && (
            <DeactivateDialog
                account={deactivating}
                isOwnAccount={deactivating.id === me.id}
                onClose={() => setDeactivating(null)}
                onDone={deactivated}
                onBlocked={showBlocked}
            />
            )}
            {blocked && <BlockedDialog title={blocked.title} message={blocked.message} onClose={() => setBlocked(null)} />}
        </div>
    )
}

export default function StaffAccountsPage() {
    const { status, data, reload } = useAsyncData(listUsers)

    if (status === 'loading') return <Spinner label="Loading accounts…" />
    if (status === 'error') return <ErrorState message="We couldn't load the accounts." onRetry={reload} />
    return <Workspace initialAccounts={data.items} />
}