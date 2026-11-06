import { describe, expect, it } from 'vitest'
import { db } from '../data/store'
import { mockUsers } from '../data/mockUsers'
import { getManilaTimeStr } from '../utils/datetime'
import { checkAvailability } from './appointmentService'
import { evaluateSlot, findNextAvailable } from './availability'
import { setEmailFault } from './mockFaults'
import { setMockActor } from './mockSession'
import { approveRequest, getStatusCounts } from './requestService'

// Mock "now" is Mon Oct 26 2026, 10:15. Oct 27 already has confirmed 9:00-10:00 and 15:00-16:00.
const slot = (date, start, end) => ({ startAt: `${date}T${start}:00+08:00`, endAt: `${date}T${end}:00+08:00` })
const user = (id) => mockUsers.find((candidate) => candidate.id === id)

describe('evaluateSlot (the conflict check)', () => {
    it('refuses an overlap and says which time it overlaps', () => {
        const verdict = evaluateSlot(slot('2026-10-27', '09:30', '10:30'))
        expect(verdict.available).toBe(false)
        expect(verdict.reason).toBe('conflict')
        expect(verdict.message).toBe('Overlaps a confirmed appointment (9:00–10:00 AM).')
    })

    it('allows back-to-back appointments (the end is exclusive)', () => {
        expect(evaluateSlot(slot('2026-10-27', '10:00', '11:00')).available).toBe(true)
        expect(evaluateSlot(slot('2026-10-27', '14:00', '15:00')).available).toBe(true)
    })

    it('ignores the appointment being moved when excludeAppointmentId is given', () => {
        expect(evaluateSlot(slot('2026-10-29', '14:00', '15:00')).available).toBe(false)
        expect(evaluateSlot({ ...slot('2026-10-29', '14:00', '15:00'), excludeAppointmentId: 'apt-0136' }).available).toBe(true)
    })

    it('refuses closed days, out-of-hours, unavailable periods, the past and a bad range', () => {
        expect(evaluateSlot(slot('2026-10-31', '10:00', '11:00')).reason).toBe('closed_day')
        expect(evaluateSlot(slot('2026-10-27', '07:00', '08:00')).reason).toBe('outside_hours')
        expect(evaluateSlot(slot('2026-10-30', '13:00', '14:00')).reason).toBe('unavailable_period')
        expect(evaluateSlot(slot('2026-10-26', '09:00', '10:00')).reason).toBe('past')
        expect(evaluateSlot(slot('2026-10-27', '11:00', '10:00')).reason).toBe('invalid_range')
    })
})

describe('findNextAvailable', () => {
    it('suggests non-overlapping slots after the requested time', () => {
        const times = findNextAvailable(slot('2026-10-27', '09:30', '10:30')).map((s) => getManilaTimeStr(s.startAt))
        expect(times).toEqual(['10:00', '11:00', '12:00'])
    })
})

describe('checkAvailability (preview)', () => {
    it('needs permission and returns suggestions when unavailable', async () => {
        setMockActor(user('user-liza'))
        await expect(checkAvailability(slot('2026-10-27', '10:00', '11:00'))).rejects.toMatchObject({ status: 403 })
        setMockActor(user('user-marco'))
        const result = await checkAvailability(slot('2026-10-27', '09:30', '10:30'))
        expect(result.available).toBe(false)
        expect(result.suggestions.length).toBe(3)
    })
})

describe('approveRequest', () => {
    const pendingBefore = () => db.requests.filter((r) => r.status === 'pending').length

    it('refuses without sign-in (401) and without permission (403), changing nothing', async () => {
        const appointments = db.appointments.length
        setMockActor(null)
        await expect(approveRequest('req-0142', slot('2026-10-27', '10:00', '11:00'))).rejects.toMatchObject({ status: 401 })
        setMockActor(user('user-liza'))
        await expect(approveRequest('req-0142', slot('2026-10-27', '10:00', '11:00'))).rejects.toMatchObject({ status: 403 })
        expect(db.appointments.length).toBe(appointments)
        expect(db.requests.find((r) => r.id === 'req-0142').status).toBe('pending')
    })

    it('refuses a conflicting time with 409 and books nothing (API-05)', async () => {
        setMockActor(user('user-marco'))
        const appointments = db.appointments.length
        await expect(approveRequest('req-0142', slot('2026-10-27', '09:30', '10:30'))).rejects.toMatchObject({
        status: 409,
        code: 'slot_unavailable',
        })
        expect(db.appointments.length).toBe(appointments)
        expect(db.requests.find((r) => r.id === 'req-0142').status).toBe('pending')
    })

    it('confirms an available time, with history, audit and a queued email (API-04)', async () => {
        setMockActor(user('user-marco'))
        const before = pendingBefore()
        const result = await approveRequest('req-0142', slot('2026-10-27', '10:00', '11:00'))
        expect(result.notification).toBe('queued')
        expect(pendingBefore()).toBe(before - 1)
        const request = db.requests.find((r) => r.id === 'req-0142')
        expect(request.status).toBe('confirmed')
        expect(db.appointments.find((a) => a.requestId === 'req-0142')).toMatchObject({ status: 'confirmed', confirmedBy: 'user-marco' })
        expect(db.statusHistory.find((h) => h.id === 'hist-0142-approved')).toMatchObject({ oldStatus: 'pending', newStatus: 'confirmed', changedBy: 'user-marco' })
        expect(db.auditLogs.some((a) => a.action === 'request.approved' && a.entityId === 'req-0142')).toBe(true)
        expect((await getStatusCounts()).statusCounts.pending).toBe(before - 1)
    })

    it('refuses a second approval of the same request (API-07)', async () => {
        const appointments = db.appointments.length
        await expect(approveRequest('req-0142', slot('2026-10-27', '11:00', '12:00'))).rejects.toMatchObject({
        status: 409,
        code: 'not_pending',
        })
        expect(db.appointments.length).toBe(appointments)
    })

    it('keeps the appointment confirmed when the email fails (API-09)', async () => {
        setMockActor(user('user-marco'))
        setEmailFault('fail')
        const result = await approveRequest('req-0141', slot('2026-10-28', '14:00', '15:00'))
        setEmailFault('none')
        expect(result.notification).toBe('failed')
        expect(db.requests.find((r) => r.id === 'req-0141').status).toBe('confirmed')
    })
})
