import Checkbox from '../ui/Checkbox'
import TextField from '../ui/TextField'

// One row per group of days (Mon–Fri, Sat–Sun): an "Open" box and the Start and End times.
// A closed group has no times. The groups themselves are fixed; only their hours change.
//   groups: [{ label, daysOfWeek, start, end }]   start/end are null when closed
//   onChange(index, { start, end })
function WorkingHoursFields({ groups, errors, onChange }) {
    return (
        <div className="flex flex-col gap-4">
            {errors.workingHours && (
            <p id="settings-workingHours" tabIndex={-1} role="alert" className="text-sm font-medium text-rejected-fg">
                {errors.workingHours}
            </p>
            )}
            {groups.map((group, index) => {
            const open = group.start !== null
            return (
                <fieldset key={group.label} className="rounded-lg border border-border p-3">
                <legend className="px-1 font-semibold text-ink">{group.label}</legend>
                <div className="grid items-start gap-3 sm:grid-cols-[auto_1fr_1fr]">
                    <div className="sm:pt-8">
                    <Checkbox
                        label="Open"
                        checked={open}
                        onChange={(event) =>
                        onChange(index, event.target.checked ? { start: '08:00', end: '17:00' } : { start: null, end: null })
                        }
                    />
                    </div>
                    <TextField
                    id={`settings-workingHours-${index}-start`}
                    label="Start"
                    type="time"
                    step={900}
                    disabled={!open}
                    value={group.start ?? ''}
                    onChange={(event) => onChange(index, { start: event.target.value })}
                    error={errors[`workingHours.${index}.start`]}
                    />
                    <TextField
                    id={`settings-workingHours-${index}-end`}
                    label="End"
                    type="time"
                    step={900}
                    disabled={!open}
                    value={group.end ?? ''}
                    onChange={(event) => onChange(index, { end: event.target.value })}
                    error={errors[`workingHours.${index}.end`]}
                    />
                </div>
                {!open && <p className="mt-2 text-sm text-muted">Closed</p>}
                </fieldset>
            )
            })}
        </div>
    )
}

export default WorkingHoursFields