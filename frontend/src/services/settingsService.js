// Mirrors: GET and PATCH /api/v1/admin/scheduling-settings   (settings.manage)
// Other features read db.settings on every call, so a saved change takes effect everywhere at once.
import { db } from '../data/store'
import { getNow } from '../utils/clock'
import { getManilaDateStr, plusMinutes } from '../utils/datetime'
import { getOfficeRuleViolation } from '../utils/officeRules'
import { PERMISSIONS } from '../utils/permissions'
import { normalizeSettings, validateSettings } from '../utils/settingsValidators'
import { ApiError } from './ApiError'
import { nowIso } from './decisions'
import { mockApi } from './mockApi'
import { requireAuthorized } from './security'

const requireManager = () => requireAuthorized(PERMISSIONS.SETTINGS_MANAGE, 'Scheduling settings')

export function getSchedulingSettings() {
    return mockApi(() => {
        requireManager()
        return db.settings
    })
}

const hoursText = (group) => (group.start ? `${group.start}–${group.end}` : 'Closed')
const SCALARS = [
    ['defaultDurationMinutes', 'Default duration (minutes)'],
    ['bufferMinutes', 'Buffer between appointments (minutes)'],
    ['requireReasonOnRejectCancel', 'Require a reason for reject and cancel'],
    ['emailOnDecision', 'Email requesters about decisions'],
    ['sendAcknowledgement', 'Send an acknowledgement'],
    ['retentionMonths', 'Record retention (months)'],
]

// What changed, for the audit entry: setting name, from, to. Never anything secret.
function describeChanges(before, after) {
    const changes = []
    after.workingHours.forEach((group, index) => {
        if (hoursText(group) !== hoursText(before.workingHours[index])) {
        changes.push({ setting: `Working hours: ${group.label}`, from: hoursText(before.workingHours[index]), to: hoursText(group) })
    }
    })
    for (const [key, setting] of SCALARS) {
        if (before[key] !== after[key]) changes.push({ setting, from: before[key], to: after[key] })
    }
    const beforeIds = new Set(before.unavailable.map((entry) => entry.id))
    const afterIds = new Set(after.unavailable.map((entry) => entry.id))
    const added = after.unavailable.filter((entry) => !beforeIds.has(entry.id)).map((entry) => entry.label)
    const removed = before.unavailable.filter((entry) => !afterIds.has(entry.id)).map((entry) => entry.label)
    const edited = after.unavailable.some((entry) => {
        const old = before.unavailable.find((row) => row.id === entry.id)
        return old && JSON.stringify(old) !== JSON.stringify(entry)
    })
    return { changes, added, removed, edited }
}

// Upcoming confirmed appointments that break the rules AS THEY NOW ARE. They are kept (not cancelled);
// staff reschedule them. Two kinds of problem: outside the hours / in an unavailable period, and
// closer to the previous appointment than the buffer allows.
function findAffectedAppointments() {
    const now = getNow()
    const upcoming = db.appointments
        .filter((appointment) => appointment.status === 'confirmed' && new Date(appointment.endAt) > now)
        .sort((a, b) => a.startAt.localeCompare(b.startAt))
    const affected = new Map()
    const describe = (appointment, reason) => {
        const request = db.requests.find((row) => row.id === appointment.requestId)
        affected.set(appointment.id, {
            id: appointment.id,
            requestId: appointment.requestId,
            referenceNumber: request.referenceNumber,
            startAt: appointment.startAt,
            endAt: appointment.endAt,
            reason,
        })
    }
    upcoming.forEach((appointment, index) => {
        const violation = getOfficeRuleViolation(appointment.startAt, appointment.endAt, db.settings)
        if (violation) {
            describe(appointment, violation.code)
            return
        }
    const previous = upcoming[index - 1]
    if (previous && new Date(appointment.startAt) < new Date(plusMinutes(previous.endAt, db.settings.bufferMinutes))) {
        describe(appointment, 'buffer')
    }
    })
    return [...affected.values()]
}

let newEntryCounter = 0

// PATCH /admin/scheduling-settings   (the whole page in one save)
// -> { settings, changed, affectedAppointments }.  Errors: 401, 403, 422 validation_failed
// (details.fieldErrors keyed by path). The timezone, the policy status and the day groups
// (which days belong to which row) cannot be changed from here, whatever the browser sends.
// The real backend saves in one transaction and should detect two administrators saving at the
// same moment (e.g. an If-Match version).
export function updateSchedulingSettings(values) {
    return mockApi(() => {
        const actor = requireManager()
        const current = db.settings
        const knownIds = new Set(current.unavailable.map((entry) => entry.id))

        if (!Array.isArray(values?.workingHours) || values.workingHours.length !== current.workingHours.length) {
        throw new ApiError(422, 'validation_failed', 'Please correct the highlighted fields.', {
            fieldErrors: { workingHours: 'The working-hours rows do not match.' },
        })
        }
        const fieldErrors = validateSettings(values, { today: getManilaDateStr(getNow()), knownIds })
        if (Object.keys(fieldErrors).length > 0) {
        throw new ApiError(422, 'validation_failed', 'Please correct the highlighted fields.', { fieldErrors })
        }

        const next = normalizeSettings(values)
        // Only start and end are taken from each working-hours row: the label and days stay as stored.
        next.workingHours = next.workingHours.map((group, index) => ({ ...current.workingHours[index], start: group.start, end: group.end }))
        // New entries (an id the server does not know) get a real id.
        next.unavailable = next.unavailable.map((entry) =>
        knownIds.has(entry.id) ? entry : { ...entry, id: `unv-new-${(newEntryCounter += 1)}` },
        )

        const { changes, added, removed, edited } = describeChanges(current, next)
        if (changes.length === 0 && added.length === 0 && removed.length === 0 && !edited) {
        return { settings: current, changed: false, affectedAppointments: [] }
        }

        Object.assign(current, next) // timezone and policyStatus are untouched
        db.auditLogs.push({
        id: `aud-new-${db.auditLogs.length + 1}`,
        userId: actor.id,
        action: 'settings.changed',
        entityType: 'settings',
        entityId: null,
        details: { changes, added, removed, ...(edited ? { editedPeriods: true } : {}) },
        ipAddress: null,
        createdAt: nowIso(),
        })
        return { settings: current, changed: true, affectedAppointments: findAffectedAppointments() }
    })
}