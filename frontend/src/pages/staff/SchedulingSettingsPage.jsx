import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Checkbox from '../../components/ui/Checkbox'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import TextField from '../../components/ui/TextField'
import PageHeader from '../../components/PageHeader'
import AddUnavailableDialog from '../../components/settings/AddUnavailableDialog'
import UnavailableList from '../../components/settings/UnavailableList'
import WorkingHoursFields from '../../components/settings/WorkingHoursFields'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useToast } from '../../hooks/useToast'
import { getSchedulingSettings, updateSchedulingSettings } from '../../services/settingsService'
import { getNow } from '../../utils/clock'
import { formatShortDate, formatTimeRange, getManilaDateStr } from '../../utils/datetime'
import { normalizeSettings, validateSettings } from '../../utils/settingsValidators'

// The form edits strings (that is what text boxes hold); they become numbers when saved.
const toDraft = (settings) => ({
    workingHours: settings.workingHours.map((group) => ({ ...group })),
    defaultDurationMinutes: String(settings.defaultDurationMinutes),
    bufferMinutes: String(settings.bufferMinutes),
    requireReasonOnRejectCancel: settings.requireReasonOnRejectCancel,
    emailOnDecision: settings.emailOnDecision,
    sendAcknowledgement: settings.sendAcknowledgement,
    retentionMonths: String(settings.retentionMonths),
    unavailable: settings.unavailable.map((entry) => ({ ...entry })),
})

const REASONS = {
    closed_day: 'the office is closed that day',
    outside_hours: 'outside office hours',
    unavailable_day: 'marked unavailable',
    unavailable_period: 'marked unavailable',
    buffer: 'too close to the previous appointment',
}
const NOT_SAVED = 'The settings were not saved. Your entries are kept. Please try again.'

// After the settings have loaded. `saved` is the server's copy; `draft` is what is on screen.
// Add and Remove change only the draft; one "Save changes" applies the whole page.
function Workspace({ initial }) {
    const toast = useToast()
    const [saved, setSaved] = useState(initial)
    const [draft, setDraft] = useState(() => toDraft(initial))
    const [errors, setErrors] = useState({})
    const [failure, setFailure] = useState(null)
    const [saving, setSaving] = useState(false)
    const [affected, setAffected] = useState(null) // appointments that no longer fit, after a save
    const [adding, setAdding] = useState(false)
    const nextTempId = useRef(1)

    const today = getManilaDateStr(getNow())
    const knownIds = new Set(saved.unavailable.map((entry) => entry.id))

    // Changing a field clears its own error.
    function change(field, value) {
        setDraft((current) => ({ ...current, [field]: value }))
        setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== field)))
    }

    function changeHours(index, patch) {
        setDraft((current) => ({
        ...current,
        workingHours: current.workingHours.map((group, i) => (i === index ? { ...group, ...patch } : group)),
        }))
        setErrors((current) =>
            Object.fromEntries(
            Object.entries(current).filter(([key]) => key !== 'workingHours' && !key.startsWith(`workingHours.${index}.`)),
            ),
        )
    }

    function addEntry(entry) {
        const id = `new-${nextTempId.current}`
        nextTempId.current += 1
        setDraft((current) => ({ ...current, unavailable: [...current.unavailable, { id, ...entry }] }))
        setAdding(false)
    }

    const removeEntry = (id) =>
        setDraft((current) => ({ ...current, unavailable: current.unavailable.filter((entry) => entry.id !== id) }))

    function focusFirstError(fieldErrors) {
        for (const key of Object.keys(fieldErrors)) {
            const element = document.getElementById(`settings-${key.replace(/\./g, '-')}`)
            if (element) {
            element.focus()
            return
            }
        }
    }

    async function handleSave() {
        if (saving) return
        setFailure(null)
        setAffected(null)
    
        const fieldErrors = validateSettings(draft, { today, knownIds })
        setErrors(fieldErrors)
        if (Object.keys(fieldErrors).length > 0) {
            focusFirstError(fieldErrors)
            return
        }
        if (JSON.stringify(normalizeSettings(draft)) === JSON.stringify(normalizeSettings(toDraft(saved)))) {
            toast.show({ tone: 'success', title: 'Nothing to save.', message: 'The settings are already like this.' })
            return
        }

        setSaving(true)
        try {
            const result = await updateSchedulingSettings(draft)
            setSaved(result.settings)
            setDraft(toDraft(result.settings))
            setAffected(result.affectedAppointments)
            toast.show({ tone: 'success', title: 'Settings saved.', message: 'The change is recorded in the audit log.' })
        } catch (error) {
            if (error.status === 422 && error.details?.fieldErrors) {
            setErrors(error.details.fieldErrors)
            focusFirstError(error.details.fieldErrors)
            setFailure('Please correct the highlighted fields.')
            } else if (error.status === 403) {
            setFailure("You don't have permission to change the settings.")
            } else {
            setFailure(NOT_SAVED)
            }
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Scheduling Settings"
                subtitle="Working hours and booking rules (Asia/Manila)"
                action={
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                </Button>
                }
            />
        
            {saved.policyStatus === 'placeholder' && (
                <Alert tone="warning" title="Proposed defaults.">
                These values are proposals until the office approves its scheduling policy. Changing them here does not
                approve them.
                </Alert>
            )}
            {failure && <Alert tone="error">{failure}</Alert>}
            {affected && affected.length > 0 && (
                <Alert
                tone="warning"
                title={`${affected.length} confirmed ${affected.length === 1 ? 'appointment no longer fits' : 'appointments no longer fit'} the rules.`}
                >
                They are kept, not cancelled. Open each one to reschedule it.
                <ul className="mt-2 flex flex-col gap-1">
                    {affected.slice(0, 5).map((appointment) => (
                    <li key={appointment.id}>
                        <Link to={`/requests/${appointment.requestId}`} className="font-mono text-sm font-semibold underline">
                        {appointment.referenceNumber}
                        </Link>{' '}
                        · {formatShortDate(appointment.startAt)}, {formatTimeRange(appointment.startAt, appointment.endAt)} ·{' '}
                        {REASONS[appointment.reason]}
                    </li>
                    ))}
                </ul>
                {affected.length > 5 && <p className="mt-1">and {affected.length - 5} more.</p>}
                </Alert>
            )}
        
            <div className="grid items-start gap-6 lg:grid-cols-2">
                <Card title="Working hours">
                <div className="flex flex-col gap-5">
                    <WorkingHoursFields groups={draft.workingHours} errors={errors} onChange={changeHours} />
                    <TextField
                    id="settings-defaultDurationMinutes"
                    label="Default duration (minutes)"
                    type="number"
                    inputMode="numeric"
                    min={15}
                    step={1}
                    value={draft.defaultDurationMinutes}
                    onChange={(event) => change('defaultDurationMinutes', event.target.value)}
                    error={errors.defaultDurationMinutes}
                    />
                    <TextField
                    id="settings-bufferMinutes"
                    label="Buffer between appointments (minutes)"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={draft.bufferMinutes}
                    onChange={(event) => change('bufferMinutes', event.target.value)}
                    error={errors.bufferMinutes}
                    />
                    <Checkbox
                    label="Require a reason for reject and cancel"
                    checked={draft.requireReasonOnRejectCancel}
                    onChange={(event) => change('requireReasonOnRejectCancel', event.target.checked)}
                    />
                </div>
                </Card>
        
                <Card>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-ink">Holidays &amp; unavailable periods</h2>
                    <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
                    + Add
                    </Button>
                </div>
                <UnavailableList entries={draft.unavailable} errors={errors} onRemove={removeEntry} />
                </Card>
            </div>
        
            <Card title="Notifications & records">
                <div className="flex flex-col gap-4">
                <Checkbox
                    label="Email requesters when a request is approved, rejected, cancelled or rescheduled"
                    checked={draft.emailOnDecision}
                    onChange={(event) => change('emailOnDecision', event.target.checked)}
                />
                <Checkbox
                    label="Send an acknowledgement when a request is received"
                    checked={draft.sendAcknowledgement}
                    onChange={(event) => change('sendAcknowledgement', event.target.checked)}
                />
                <TextField
                    id="settings-retentionMonths"
                    label="Record retention (months)"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={draft.retentionMonths}
                    onChange={(event) => change('retentionMonths', event.target.value)}
                    error={errors.retentionMonths}
                />
                <p className="text-sm text-muted">
                    Retention follows office-approved rules. Email credentials are managed outside this page.
                </p>
                </div>
            </Card>
        
            {adding && <AddUnavailableDialog today={today} onAdd={addEntry} onClose={() => setAdding(false)} />}
        </div>
    )
}

function SchedulingSettingsPage() {
    const { status, data, reload } = useAsyncData(getSchedulingSettings)

    if (status === 'loading') return <Spinner label="Loading settings…" />
    if (status === 'error') return <ErrorState message="We couldn't load the settings." onRetry={reload} />
    return <Workspace initial={data} />
}

export default SchedulingSettingsPage