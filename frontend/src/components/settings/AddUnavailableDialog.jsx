import { useState } from 'react'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import TextField from '../ui/TextField'
import { SETTINGS_LIMITS, validateUnavailableEntry } from '../../utils/settingsValidators'

// "+ Add": a holiday or unavailable period. Empty times mean the whole day. Mount only while open.
//   onAdd(entry)  adds it to the page's draft (nothing is saved until Save changes)
function AddUnavailableDialog({ today, onAdd, onClose }) {
    const [values, setValues] = useState({ label: '', date: '', start: '', end: '' })
    const [errors, setErrors] = useState({})

    const change = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }))

    function handleSubmit(event) {
        event.preventDefault()
        const fieldErrors = validateUnavailableEntry(values, { today })
        setErrors(fieldErrors)
        const first = ['label', 'date', 'start', 'end'].find((field) => fieldErrors[field])
        if (first) {
            document.getElementById(`add-unavailable-${first}`)?.focus()
            return
        }
        onAdd({
            label: values.label.trim(),
            date: values.date,
            start: values.start || null,
            end: values.end || null,
        })
    }

    return (
        <Modal open onClose={onClose} title="Add a holiday or unavailable period">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <TextField
                id="add-unavailable-label"
                label="Label"
                required
                maxLength={SETTINGS_LIMITS.labelMax}
                value={values.label}
                onChange={change('label')}
                error={errors.label}
            />
            <TextField
                id="add-unavailable-date"
                label="Date"
                type="date"
                min={today}
                required
                value={values.date}
                onChange={change('date')}
                error={errors.date}
            />
            <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                id="add-unavailable-start"
                label="Start"
                type="time"
                step={900}
                value={values.start}
                onChange={change('start')}
                error={errors.start}
                />
                <TextField
                id="add-unavailable-end"
                label="End"
                type="time"
                step={900}
                value={values.end}
                onChange={change('end')}
                error={errors.end}
                />
            </div>
            <p className="text-sm text-muted">Leave the times empty for the whole day.</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="secondary" onClick={onClose}>
                Cancel
                </Button>
                <Button type="submit">Add</Button>
            </div>
            </form>
        </Modal>
    )
}

export default AddUnavailableDialog