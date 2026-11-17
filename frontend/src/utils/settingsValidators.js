import { isValidDateString } from './calendarMath'

// The rules for the Scheduling Settings screen. Pure, so the screen and the (mock) server apply
// the SAME checks. The numeric limits are PROPOSALS until the office approves its policy.
export const SETTINGS_LIMITS = {
    durationMin: 15,
    durationMax: 480,
    bufferMax: 240,
    retentionMin: 1,
    retentionMax: 120,
    labelMax: 100,
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const toMinutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

// "45" or 45 -> 45. Anything else (empty, "4.5", "-3", "abc") -> NaN.
export function toWholeNumber(value) {
    if (typeof value === 'number') return Number.isInteger(value) ? value : NaN
    return /^\d+$/.test((value ?? '').toString().trim()) ? Number(value.trim()) : NaN
}

const hasText = (value) => typeof value === 'string' && value.trim() !== ''

// Times of one entry: both or neither, valid, 15-minute steps, end after start.
// `prefix` is where the error goes, e.g. 'workingHours.0' or 'unavailable.2'.
function checkTimes(start, end, prefix, errors, { required }) {
    const startGiven = hasText(start)
    const endGiven = hasText(end)
    if (!startGiven && !endGiven) return
    if (startGiven !== endGiven) {
        errors[`${prefix}.${startGiven ? 'end' : 'start'}`] = required
            ? 'Enter both times, or mark the day as closed.'
            : 'Enter both times, or leave both empty for the whole day.'
        return
    }
    if (!TIME_PATTERN.test(start)) errors[`${prefix}.start`] = 'Enter a valid time.'
    else if (toMinutes(start) % 15 !== 0) errors[`${prefix}.start`] = 'Use 15-minute steps.'
    if (!TIME_PATTERN.test(end)) errors[`${prefix}.end`] = 'Enter a valid time.'
    else if (toMinutes(end) % 15 !== 0) errors[`${prefix}.end`] = 'Use 15-minute steps.'
    if (!errors[`${prefix}.start`] && !errors[`${prefix}.end`] && toMinutes(end) <= toMinutes(start)) {
        errors[`${prefix}.end`] = 'The end time must be after the start time.'
    }
}

// One holiday / unavailable period. `isNew` entries cannot be in the past (existing ones stay
// until removed). Used by the "Add" dialog and by validateSettings.
export function validateUnavailableEntry(entry, { today, isNew = true, prefix = '' }) {
    const errors = {}
    const key = (field) => (prefix ? `${prefix}.${field}` : field)
    const label = (entry.label ?? '').trim()
    if (!label) errors[key('label')] = 'Enter a label.'
    else if (label.length > SETTINGS_LIMITS.labelMax) errors[key('label')] = `Use ${SETTINGS_LIMITS.labelMax} characters or fewer.`

    if (!entry.date) errors[key('date')] = 'Choose a date.'
    else if (!isValidDateString(entry.date)) errors[key('date')] = 'Enter a valid date.'
    else if (isNew && entry.date < today) errors[key('date')] = 'Choose a date that is not in the past.'

    const times = {}
    checkTimes(entry.start, entry.end, 'x', times, { required: false })
    if (times['x.start']) errors[key('start')] = times['x.start']
    if (times['x.end']) errors[key('end')] = times['x.end']
    return errors
}

// The whole page. Errors are keyed by path: 'defaultDurationMinutes', 'workingHours.0.end',
// 'workingHours' (not a single day), 'unavailable.1.label' ...
//   today:    'YYYY-MM-DD' (Manila)
//   knownIds: ids of entries that already existed (they may be in the past)
export function validateSettings(draft, { today, knownIds = new Set() }) {
    const errors = {}

    draft.workingHours.forEach((group, index) => {
        checkTimes(group.start, group.end, `workingHours.${index}`, errors, { required: true })
    })
    if (!draft.workingHours.some((group) => hasText(group.start) && hasText(group.end))) {
        errors.workingHours = 'The office must be open at least one day a week.'
    }

    const duration = toWholeNumber(draft.defaultDurationMinutes)
    if (!(duration >= SETTINGS_LIMITS.durationMin && duration <= SETTINGS_LIMITS.durationMax)) {
        errors.defaultDurationMinutes = `Enter a whole number of minutes from ${SETTINGS_LIMITS.durationMin} to ${SETTINGS_LIMITS.durationMax}.`
    }
    const buffer = toWholeNumber(draft.bufferMinutes)
    if (!(buffer >= 0 && buffer <= SETTINGS_LIMITS.bufferMax)) {
        errors.bufferMinutes = `Enter a whole number of minutes from 0 to ${SETTINGS_LIMITS.bufferMax}.`
    }
    const retention = toWholeNumber(draft.retentionMonths)
    if (!(retention >= SETTINGS_LIMITS.retentionMin && retention <= SETTINGS_LIMITS.retentionMax)) {
        errors.retentionMonths = `Enter a whole number of months from ${SETTINGS_LIMITS.retentionMin} to ${SETTINGS_LIMITS.retentionMax}.`
    }

    draft.unavailable.forEach((entry, index) => {
        Object.assign(
            errors,
            validateUnavailableEntry(entry, { today, isNew: !knownIds.has(entry.id), prefix: `unavailable.${index}` }),
        )
        })
    return errors
}

// The draft as it is stored: numbers as numbers, labels trimmed, empty times as null,
// unavailable periods sorted by date and start.
export function normalizeSettings(draft) {
    return {
        workingHours: draft.workingHours.map((group) => ({
            label: group.label,
            daysOfWeek: group.daysOfWeek,
            start: hasText(group.start) ? group.start : null,
            end: hasText(group.end) ? group.end : null,
    })),
    defaultDurationMinutes: toWholeNumber(draft.defaultDurationMinutes),
    bufferMinutes: toWholeNumber(draft.bufferMinutes),
    requireReasonOnRejectCancel: Boolean(draft.requireReasonOnRejectCancel),
    emailOnDecision: Boolean(draft.emailOnDecision),
    sendAcknowledgement: Boolean(draft.sendAcknowledgement),
    retentionMonths: toWholeNumber(draft.retentionMonths),
    unavailable: draft.unavailable
        .map((entry) => ({
            id: entry.id,
            label: entry.label.trim(),
            date: entry.date,
            start: hasText(entry.start) ? entry.start : null,
            end: hasText(entry.end) ? entry.end : null,
        }))
        .sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? '').localeCompare(b.start ?? '')),
    }
}