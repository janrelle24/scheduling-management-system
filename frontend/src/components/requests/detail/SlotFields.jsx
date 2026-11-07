import Alert from '../../ui/Alert'
import Button from '../../ui/Button'
import TextField from '../../ui/TextField'
import { formatShortDate, formatTimeRange, getManilaDateStr } from '../../../utils/datetime'

// "10:00–11:00 AM", or "Oct 28, 9:00–10:00 AM" when it is on another day than the chosen date.
const describeSuggestion = (suggestion, date) =>
    (getManilaDateStr(suggestion.startAt) === date ? '' : `${formatShortDate(suggestion.startAt)}, `) +
    formatTimeRange(suggestion.startAt, suggestion.endAt)

// The fields and the live-check result for a useSlotPicker(). Used by Approve and Reschedule.
function SlotFields({ picker, labels = { date: 'Date', start: 'Start', end: 'End' } }){
    const { check, waiting, available, unchanged, complete, editing } = picker

    return (
        <>
            <TextField label={labels.date} type="date" value={picker.date} onChange={(event) => picker.setDate(event.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                label={labels.start}
                type="time"
                step={900}
                value={picker.start}
                onChange={(event) => picker.setStart(event.target.value)}
                />
                <TextField
                label={labels.end}
                type="time"
                step={900}
                value={picker.end}
                onChange={(event) => picker.setEnd(event.target.value)}
                />
            </div>
        
            {unchanged && <Alert tone="warning">This is the current time. Choose a new time.</Alert>}
            {!unchanged && !complete && !editing && (
                <Alert tone="warning">Enter a date, a start time and an end time.</Alert>
            )}
            {!unchanged && complete && waiting && (
                <p role="status" className="text-muted">
                Checking availability…
                </p>
            )}
            {!unchanged && !waiting && check.status === 'error' && (
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
            {!unchanged && !waiting && check.status === 'success' && check.data && !check.data.available && (
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
                            <Button variant="secondary" size="sm" onClick={() => picker.applySuggestion(suggestion)}>
                            {describeSuggestion(suggestion, picker.date)}
                            </Button>
                        </li>
                        ))}
                    </ul>
                    </div>
                )}
                </>
            )}
        </>
    )
}
export default SlotFields