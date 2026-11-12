import { describe, expect, it } from 'vitest'
import { db } from '../data/store'
import { mockUsers } from '../data/mockUsers'
import { getCalendar } from './appointmentService'
import { setMockActor } from './mockSession'

// Marco and Liza can view both requests and appointments; Elena (administrator) cannot view either.
// account, so these tests change the stored permissions (and put them back) to try other cases.
const as = (id) => setMockActor(mockUsers.find((candidate) => candidate.id === id))
const week = { from: '2026-10-26', to: '2026-11-01' }

describe('getCalendar', () => {
    it('refuses without sign-in (401), for a deactivated account (401) and without any view permission (403)', async () => {
        setMockActor(null)
        await expect(getCalendar(week)).rejects.toMatchObject({ status: 401 })
        as('user-ben') // deactivated: the stored account is inactive, so the session is over
        await expect(getCalendar(week)).rejects.toMatchObject({ status: 401, code: 'session_ended' })
    
        const liza = db.users.find((u) => u.id === 'user-liza')
        const kept = liza.permissions
        liza.permissions = ['reports.view'] // can view neither requests nor appointments
        as('user-liza')
        await expect(getCalendar(week)).rejects.toMatchObject({ status: 403 })
        liza.permissions = kept
    })

    it('returns confirmed appointments and pending requests for the week, in time order', async () => {
        as('user-marco')
        const { events, from, to } = await getCalendar(week)
        expect([from, to]).toEqual([week.from, week.to])
        expect(events.some((e) => e.kind === 'appointment' && e.status === 'confirmed')).toBe(true)
        expect(events.some((e) => e.kind === 'request' && e.status === 'pending')).toBe(true)
        expect(events.map((e) => e.startAt)).toEqual([...events.map((e) => e.startAt)].sort())
        expect(events.every((e) => e.startAt.slice(0, 10) >= week.from && e.startAt.slice(0, 10) <= week.to)).toBe(true)
    })

    it('never shows cancelled appointments or rejected requests', async () => {
        as('user-marco')
        const { events } = await getCalendar({ from: '2026-09-01', to: '2026-12-31' })
        const cancelled = db.appointments.filter((a) => a.status === 'cancelled').map((a) => a.id)
        const rejected = db.requests.filter((r) => r.status === 'rejected').map((r) => r.id)
        expect(events.some((e) => cancelled.includes(e.id) || rejected.includes(e.id))).toBe(false)
    })

    it('gives appointments by purpose only, with no requester name (BR-009)', async () => {
        as('user-marco')
        const { events } = await getCalendar(week)
        const appointments = events.filter((e) => e.kind === 'appointment')
        expect(appointments.length > 0).toBe(true)
        expect(appointments.every((e) => !('requesterName' in e))).toBe(true)
        expect(events.filter((e) => e.kind === 'request').every((e) => typeof e.requesterName === 'string')).toBe(true)
    })

    it('shows pending requests only to users who can view requests, and appointments only to users who can view appointments', async () => {
        as('user-marco')
        const everything = await getCalendar(week)
        const marco = db.users.find((u) => u.id === 'user-marco')
        const kept = marco.permissions

        marco.permissions = ['appointments.view']
        const appointmentsOnly = await getCalendar(week)
        expect(appointmentsOnly.events.every((e) => e.kind === 'appointment')).toBe(true)
        expect(appointmentsOnly.events.length < everything.events.length).toBe(true)

        marco.permissions = ['requests.view']
        const requestsOnly = await getCalendar(week)
        expect(requestsOnly.events.every((e) => e.kind === 'request')).toBe(true)
        marco.permissions = kept
    })

    it('includes the working hours and the unavailable periods inside the range', async () => {
        as('user-marco')
        const result = await getCalendar(week)
        expect(result.workingHours.length > 0).toBe(true)
        expect(result.unavailable.map((u) => u.label)).toEqual(['Out of office']) // Oct 30; Christmas is out of range
        expect((await getCalendar({ from: '2026-12-01', to: '2026-12-31' })).unavailable.map((u) => u.label)).toEqual(['Christmas Day'])
    })

    it('returns an empty list for a quiet range', async () => {
        as('user-marco')
        expect((await getCalendar({ from: '2027-03-01', to: '2027-03-07' })).events).toEqual([])
    })
})
