import { describe, expect, it } from 'vitest'
import { db } from '../data/store'
import { evaluateSlot } from './availability'
import { setEmailFault } from './mockFaults'
import { setMockActor } from './mockSession'
import { getSchedulingPolicy } from './policyService'
import { submitRequest } from './publicRequestService'
import { approveRequest, createRequest, rejectRequest } from './requestService'
import { getSchedulingSettings, updateSchedulingSettings } from './settingsService'

// Elena (administrator) manages settings. Mock "now" is Mon Oct 26 2026, 10:15.
const as = (id) => setMockActor(db.users.find((u) => u.id === id))
const original = structuredClone(db.settings)
const reset = () => Object.assign(db.settings, structuredClone(original))
const audit = (action) => db.auditLogs.filter((row) => row.action === action)
const slot = (date, start, end) => ({ startAt: `${date}T${start}:00+08:00`, endAt: `${date}T${end}:00+08:00` })

// A draft the way the screen builds it: numbers as strings, everything else as stored.
const draft = (change = () => {}) => {
    const s = structuredClone(db.settings)
    const d = {
        workingHours: s.workingHours,
        defaultDurationMinutes: String(s.defaultDurationMinutes),
        bufferMinutes: String(s.bufferMinutes),
        requireReasonOnRejectCancel: s.requireReasonOnRejectCancel,
        emailOnDecision: s.emailOnDecision,
        sendAcknowledgement: s.sendAcknowledgement,
        retentionMonths: String(s.retentionMonths),
        unavailable: s.unavailable,
    }
    change(d)
    return d
}
const rejection = async (promise) => {
    try {
        await promise
    } catch (error) {
        return error
    }
    return null
}

describe('who may manage settings', () => {
    it('refuses a staff member (403), recording the attempt as a security event', async () => {
        as('user-marco')
        const before = audit('security.access_denied').length
        expect((await rejection(getSchedulingSettings())).status).toBe(403)
        expect((await rejection(updateSchedulingSettings(draft()))).status).toBe(403)
        const added = audit('security.access_denied').slice(before)
        expect(added.length).toBe(2)
        expect(added[0].details).toEqual({ attempted: 'Scheduling settings', result: 'failed' })
    })

    it('refuses nobody-signed-in (401) and lets the administrator read the settings', async () => {
        setMockActor(null)
        expect((await rejection(getSchedulingSettings())).status).toBe(401)
        as('user-elena')
        const settings = await getSchedulingSettings()
        expect(settings).toMatchObject({ defaultDurationMinutes: 60, bufferMinutes: 0, retentionMonths: 24, timezone: 'Asia/Manila', policyStatus: 'placeholder' })
        expect(settings.workingHours.length).toBe(2)
    })
})

describe('validation and tampering', () => {
    it('refuses bad input (422) with field paths, and saves nothing', async () => {
        as('user-elena')
        const before = JSON.stringify(db.settings)
        const error = await rejection(updateSchedulingSettings(draft((d) => {
        d.defaultDurationMinutes = '0'
        d.bufferMinutes = '-1'
        d.retentionMonths = '0'
        d.workingHours[0].end = '07:00'
        d.unavailable[0].label = ''
        })))
        expect(error.status).toBe(422)
        expect(Object.keys(error.details.fieldErrors).sort()).toEqual(['bufferMinutes', 'defaultDurationMinutes', 'retentionMonths', 'unavailable.0.label', 'workingHours.0.end'])
        expect(JSON.stringify(db.settings)).toBe(before)
    })

    it('refuses closing every day', async () => {
        as('user-elena')
        const error = await rejection(updateSchedulingSettings(draft((d) => { d.workingHours[0].start = null; d.workingHours[0].end = null })))
        expect(error.details.fieldErrors.workingHours).toBe('The office must be open at least one day a week.')
    })

    it('refuses a new period in the past, but keeps an old existing one', async () => {
        as('user-elena')
        const error = await rejection(updateSchedulingSettings(draft((d) => { d.unavailable.push({ id: 'new-1', label: 'Old', date: '2026-01-05', start: null, end: null }) })))
        expect(error.details.fieldErrors['unavailable.2.date']).toBe('Choose a date that is not in the past.')
    })

    it('ignores the timezone, policy status, labels and days a browser might send', async () => {
        as('user-elena')
        const result = await updateSchedulingSettings({
        ...draft((d) => { d.bufferMinutes = '10' }),
        timezone: 'America/New_York',
        policyStatus: 'approved',
        })
        expect(result.settings.bufferMinutes).toBe(10)
        expect(db.settings.timezone).toBe('Asia/Manila')
        expect(db.settings.policyStatus).toBe('placeholder')
        const tampered = draft((d) => { d.workingHours[0] = { label: 'Hacked', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], start: '08:00', end: '17:00' } })
        await updateSchedulingSettings(tampered)
        expect(db.settings.workingHours[0]).toMatchObject({ label: 'Mon–Fri', daysOfWeek: [1, 2, 3, 4, 5] })
        expect((await rejection(updateSchedulingSettings({ ...draft(), workingHours: [] }))).status).toBe(422)
        reset()
    })

    it('records nothing when nothing changed', async () => {
        as('user-elena')
        const count = db.auditLogs.length
        const result = await updateSchedulingSettings(draft())
        expect(result).toMatchObject({ changed: false, affectedAppointments: [] })
        expect(db.auditLogs.length).toBe(count)
    })
})

describe('a saved change takes effect everywhere', () => {
    it('shorter hours: the availability check, the public form and approval refuse the new evening; the audit says what changed', async () => {
        as('user-elena')
        const result = await updateSchedulingSettings(draft((d) => { d.workingHours[0].end = '16:00' }))
        expect(result.changed).toBe(true)
        expect(evaluateSlot(slot('2026-10-28', '16:00', '17:00'))).toMatchObject({ available: false, reason: 'outside_hours' })
        expect(evaluateSlot(slot('2026-10-28', '15:00', '16:00')).available).toBe(true)
        expect((await rejection(submitRequest({ fullName: 'Late Person', email: 'late@example.com', phone: '', purpose: 'Visit', date: '2026-11-03', startTime: '16:30' }))).status).toBe(422)
        const entry = audit('settings.changed').at(-1)
        expect(entry).toMatchObject({ userId: 'user-elena', details: { changes: [{ setting: 'Working hours: Mon–Fri', from: '08:00–17:00', to: '08:00–16:00' }] } })
        expect(JSON.stringify(entry)).not.toContain('password')
        reset()
    })

    it('opening Saturday makes it bookable', async () => {
        as('user-elena')
        expect(evaluateSlot(slot('2026-10-31', '09:00', '10:00')).reason).toBe('closed_day')
        await updateSchedulingSettings(draft((d) => { d.workingHours[1].start = '09:00'; d.workingHours[1].end = '12:00' }))
        expect(evaluateSlot(slot('2026-10-31', '09:00', '10:00')).available).toBe(true)
        expect(evaluateSlot(slot('2026-10-31', '12:00', '13:00')).reason).toBe('outside_hours')
        reset()
    })

    it('adds and removes holidays and unavailable periods, giving new ones a real id', async () => {
        as('user-elena')
        const added = await updateSchedulingSettings(draft((d) => {
        d.unavailable.push({ id: 'new-1', label: 'All Souls’ Day', date: '2026-11-02', start: null, end: null })
        d.unavailable.push({ id: 'new-2', label: 'Meeting', date: '2026-11-03', start: '14:00', end: '15:00' })
        }))
        const day = added.settings.unavailable.find((u) => u.label === 'All Souls’ Day')
        expect(day.id.startsWith('unv-new-')).toBe(true)
        expect(evaluateSlot(slot('2026-11-02', '09:00', '10:00')).reason).toBe('unavailable_day')
        expect(evaluateSlot(slot('2026-11-03', '14:00', '15:00')).reason).toBe('unavailable_period')
        expect(evaluateSlot(slot('2026-11-03', '10:00', '11:00')).available).toBe(true)
        expect(audit('settings.changed').at(-1).details.added).toEqual(['All Souls’ Day', 'Meeting'])

        await updateSchedulingSettings(draft((d) => { d.unavailable = d.unavailable.filter((u) => u.label !== 'All Souls’ Day') }))
        expect(evaluateSlot(slot('2026-11-02', '09:00', '10:00')).available).toBe(true)
        expect(audit('settings.changed').at(-1).details.removed).toEqual(['All Souls’ Day'])
        reset()
    })

    it('a buffer keeps appointments apart', async () => {
        as('user-elena')
        expect(evaluateSlot(slot('2026-10-27', '10:00', '11:00')).available).toBe(true) // right after 9:00-10:00
        await updateSchedulingSettings(draft((d) => { d.bufferMinutes = '15' }))
        expect(evaluateSlot(slot('2026-10-27', '10:00', '11:00'))).toMatchObject({ available: false, reason: 'conflict' })
        expect(evaluateSlot(slot('2026-10-27', '10:15', '11:15')).available).toBe(true)
        reset()
    })

    it('the default duration changes new requests and the staff form default', async () => {
        as('user-elena')
        await updateSchedulingSettings(draft((d) => { d.defaultDurationMinutes = '30' }))
        expect((await getSchedulingPolicy()).defaultDurationMinutes).toBe(30)
        const result = await submitRequest({ fullName: 'Short Visit', email: 'short@example.com', phone: '', purpose: 'Visit', date: '2026-11-09', startTime: '09:00' })
        expect(result.preferredEndAt).toBe('2026-11-09T09:30:00+08:00')
        reset()
    })

    it('"reason required" off lets a reject go through without a reason', async () => {
        as('user-elena')
        await updateSchedulingSettings(draft((d) => { d.requireReasonOnRejectCancel = false }))
        expect((await getSchedulingPolicy()).requireReason).toBe(false)
        as('user-marco')
        expect((await rejectRequest('req-0141', { reason: '' })).notification).toBeDefined()
        expect(db.statusHistory.find((h) => h.requestId === 'req-0141' && h.newStatus === 'rejected').reason).toBe(null)
        as('user-elena')
        reset()
    })

    it('the email toggles stop decision emails and acknowledgements', async () => {
        as('user-elena')
        await updateSchedulingSettings(draft((d) => { d.emailOnDecision = false; d.sendAcknowledgement = false }))
        as('user-marco')
        const created = await createRequest({ fullName: 'No Mail', email: 'nomail@example.com', phone: '', purpose: 'Visit', date: '2026-11-10', startTime: '10:00', endTime: '11:00', internalNotes: '' })
        expect(created.acknowledgement).toBe('none')
        const approved = await approveRequest('req-0142', slot('2026-10-27', '10:00', '11:00'))
        expect(approved.notification).toBe('none')
        as('user-elena')
        reset()
        setEmailFault('none')
    })
})

describe('upcoming appointments that no longer fit are reported, and kept', () => {
    it('lists confirmed appointments outside the new hours', async () => {
        as('user-elena')
        const confirmedBefore = db.appointments.filter((a) => a.status === 'confirmed').length
        const result = await updateSchedulingSettings(draft((d) => { d.workingHours[0].end = '09:30' }))
        expect(result.affectedAppointments.length > 0).toBe(true)
        expect(result.affectedAppointments.every((a) => a.reason === 'outside_hours' && a.referenceNumber.startsWith('REQ-2026-'))).toBe(true)
        expect(result.affectedAppointments.every((a) => new Date(a.endAt) > new Date('2026-10-26T10:15:00+08:00'))).toBe(true) // only upcoming ones
        expect(db.appointments.filter((a) => a.status === 'confirmed').length).toBe(confirmedBefore) // none cancelled
        reset()
    })

    it('lists appointments a new holiday covers, and ones too close under a larger buffer', async () => {
        as('user-elena')
        const holiday = await updateSchedulingSettings(draft((d) => { d.unavailable.push({ id: 'new-1', label: 'Office closed', date: '2026-10-27', start: null, end: null }) }))
        expect(holiday.affectedAppointments.some((a) => a.reason === 'unavailable_day' && a.startAt.startsWith('2026-10-27'))).toBe(true)
        reset()
        const buffer = await updateSchedulingSettings(draft((d) => { d.bufferMinutes = '240' }))
        expect(buffer.affectedAppointments.some((a) => a.reason === 'buffer')).toBe(true) // 11:30 -> 14:00 is 150 minutes
        reset()
    })

    it('reports nothing when the change breaks no appointment', async () => {
        as('user-elena')
        const result = await updateSchedulingSettings(draft((d) => { d.retentionMonths = '36' }))
        expect(result).toMatchObject({ changed: true, affectedAppointments: [] })
        reset()
    })
})
