import { describe, expect, it } from 'vitest'
import { db } from '../data/store'
import { mockUsers } from '../data/mockUsers'
import { cancelAppointment, checkAvailability, rescheduleAppointment } from './appointmentService'
import { evaluateSlot } from './availability'
import { setEmailFault } from './mockFaults'
import { setMockActor } from './mockSession'
import { getSchedulingPolicy } from './policyService'
import { approveRequest, getRequest, rejectRequest } from './requestService'

// Mock "now" is Mon Oct 26 2026, 10:15. Oct 27 has confirmed 9:00-10:00 and 15:00-16:00.
// Marco can approve and reject; Liza can cancel and reschedule.
const slot = (date, start, end) => ({ startAt: `${date}T${start}:00+08:00`, endAt: `${date}T${end}:00+08:00` })
const as = (id) => setMockActor(mockUsers.find((candidate) => candidate.id === id))
const apt = (id) => db.appointments.find((a) => a.id === id)
const req = (id) => db.requests.find((r) => r.id === id)

describe('getSchedulingPolicy', () => {
    it('tells any signed-in user whether a reason is required, and refuses nobody-signed-in', async () => {
        setMockActor(null)
        await expect(getSchedulingPolicy()).rejects.toMatchObject({ status: 401 })
        as('user-liza')
        expect((await getSchedulingPolicy()).requireReason).toBe(true)
    })
})

describe('rejectRequest', () => {
    it('refuses without permission (403), changing nothing', async () => {
        as('user-liza')
        await expect(rejectRequest('req-0141', { reason: 'No.' })).rejects.toMatchObject({ status: 403 })
        expect(req('req-0141').status).toBe('pending')
    })

    it('blocks an empty reason and one that is too long (422)', async () => {
        as('user-marco')
        await expect(rejectRequest('req-0141', { reason: '   ' })).rejects.toMatchObject({ status: 422 })
        await expect(rejectRequest('req-0141', { reason: 'x'.repeat(501) })).rejects.toMatchObject({ status: 422 })
        expect(req('req-0141').status).toBe('pending')
    })

    it('rejects a pending request with a reason, history, audit and a queued email', async () => {
        as('user-marco')
        const result = await rejectRequest('req-0141', { reason: '  Not available that week.  ' })
        expect(result.notification).toBe('queued')
        expect(req('req-0141').status).toBe('rejected')
        expect(db.appointments.some((a) => a.requestId === 'req-0141')).toBe(false) // never reserved a time
        const history = db.statusHistory.find((h) => h.requestId === 'req-0141' && h.newStatus === 'rejected')
        expect(history).toMatchObject({ oldStatus: 'pending', changedBy: 'user-marco', reason: 'Not available that week.' })
        expect(db.auditLogs.some((a) => a.action === 'request.rejected' && a.entityId === 'req-0141')).toBe(true)
        expect(db.notifications.some((n) => n.requestId === 'req-0141' && n.templateKey === 'rejection' && n.status === 'queued')).toBe(true)
    })

    it('refuses a request that is no longer pending (409)', async () => {
        await expect(rejectRequest('req-0141', { reason: 'Again.' })).rejects.toMatchObject({ status: 409, code: 'not_pending' })
        await expect(rejectRequest('req-9999', { reason: 'x' })).rejects.toMatchObject({ status: 404 })
    })
})

describe('rescheduleAppointment', () => {
    const before = () => ({ start: apt('apt-0136').startAt, end: apt('apt-0136').endAt })

    it('refuses without permission (403)', async () => {
        as('user-marco')
        await expect(rescheduleAppointment('apt-0136', slot('2026-10-29', '15:00', '16:00'))).rejects.toMatchObject({ status: 403 })
    })

    it('refuses a conflicting time with 409 and keeps the original time (API-08)', async () => {
        as('user-liza')
        const original = before()
        await expect(rescheduleAppointment('apt-0136', slot('2026-10-27', '09:30', '10:30'))).rejects.toMatchObject({
        status: 409,
        code: 'slot_unavailable',
        })
        expect(before()).toEqual(original)
    })

    it('refuses the same time (422) and a time in the past (422)', async () => {
        as('user-liza')
        const { start, end } = before()
        await expect(rescheduleAppointment('apt-0136', { startAt: start, endAt: end })).rejects.toMatchObject({ status: 422, code: 'no_change' })
        await expect(rescheduleAppointment('apt-0136', slot('2026-10-26', '09:00', '10:00'))).rejects.toMatchObject({ status: 422 })
    })

    it('previews the appointment’s own slot as available when it is excluded', async () => {
        as('user-liza')
        const result = await checkAvailability({ ...slot('2026-10-29', '14:00', '15:00'), excludeAppointmentId: 'apt-0136' })
        expect(result.available).toBe(true)
    })

    it('moves the appointment, keeps it confirmed and frees the old time', async () => {
        as('user-liza')
        const result = await rescheduleAppointment('apt-0136', slot('2026-10-29', '15:00', '16:00'))
        expect(result.notification).toBe('queued')
        expect(apt('apt-0136')).toMatchObject({ status: 'confirmed', startAt: '2026-10-29T15:00:00+08:00' })
        expect(evaluateSlot(slot('2026-10-29', '14:00', '15:00')).available).toBe(true) // old time released
        expect(evaluateSlot(slot('2026-10-29', '15:00', '16:00')).available).toBe(false) // new time taken
        const audit = db.auditLogs.find((a) => a.action === 'appointment.rescheduled' && a.createdAt === apt('apt-0136').updatedAt)
        expect(audit.details.toStartAt).toBe('2026-10-29T15:00:00+08:00')
        expect(db.notifications.some((n) => n.appointmentId === 'apt-0136' && n.templateKey === 'reschedule' && n.status === 'queued')).toBe(true)
    })

    it('refuses an appointment that has already ended (409)', async () => {
        as('user-liza')
        // 9:00-10:00 today, confirmed, but "now" is 10:15
        const ended = db.appointments.find((a) => a.status === 'confirmed' && a.endAt <= '2026-10-26T10:15:00+08:00')
        await expect(rescheduleAppointment(ended.id, slot('2026-10-30', '09:00', '10:00'))).rejects.toMatchObject({ status: 409, code: 'already_ended' })
    })
})

describe('cancelAppointment', () => {
    it('refuses without permission (403) and without a reason (422), changing nothing', async () => {
        as('user-marco')
        await expect(cancelAppointment('apt-0136', { reason: 'x' })).rejects.toMatchObject({ status: 403 })
        as('user-liza')
        await expect(cancelAppointment('apt-0136', { reason: '' })).rejects.toMatchObject({ status: 422 })
        expect(apt('apt-0136').status).toBe('confirmed')
    })

    it('cancels, releases the time and queues an email even when it fails to send', async () => {
        as('user-liza')
        setEmailFault('fail')
        const result = await cancelAppointment('apt-0136', { reason: 'Requester asked to cancel.' })
        setEmailFault('none')
        expect(result.notification).toBe('failed')
        expect(apt('apt-0136').status).toBe('cancelled') // a failed email never undoes it
        expect(req('req-0136').status).toBe('cancelled')
        expect(evaluateSlot(slot('2026-10-29', '15:00', '16:00')).available).toBe(true) // released (BR-006)
        const row = db.statusHistory.find((h) => h.appointmentId === 'apt-0136' && h.newStatus === 'cancelled')
        expect(row).toMatchObject({ oldStatus: 'confirmed', reason: 'Requester asked to cancel.', changedBy: 'user-liza' })
        expect((await getRequest('req-0136')).displayStatus).toBe('cancelled')
    })

    it('does not process a second cancel (409)', async () => {
        as('user-liza')
        await expect(cancelAppointment('apt-0136', { reason: 'Again.' })).rejects.toMatchObject({ status: 409, code: 'not_active' })
        await expect(cancelAppointment('apt-9999', { reason: 'x' })).rejects.toMatchObject({ status: 404 })
    })
})

describe('email policy', () => {
    it('queues no email when the office has turned decision emails off, and still books', async () => {
        as('user-marco')
        const pending = db.requests.find((r) => r.status === 'pending' && r.requesterEmail)
        db.settings.emailOnDecision = false
        const result = await approveRequest(pending.id, slot('2026-10-28', '14:00', '15:00'))
        db.settings.emailOnDecision = true
        expect(result.notification).toBe('none')
        expect(req(pending.id).status).toBe('confirmed')
        expect(db.notifications.some((n) => n.requestId === pending.id && n.templateKey === 'approval')).toBe(false)
    })
})