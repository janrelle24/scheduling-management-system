import { describe, expect, it } from 'vitest'
import { db } from '../data/store'
import { mockUsers } from '../data/mockUsers'
import { setMockActor } from './mockSession'
import { setSubmissionFault } from './mockFaults'
import { getSchedulingPolicy } from './policyService'
import { submitRequest } from './publicRequestService'
import { createRequest, findPossibleDuplicates, getStatusCounts, listRequests } from './requestService'

// Mock "now" is Mon Oct 26 2026, 10:15. Marco can create requests; Liza cannot.
const as = (id) => setMockActor(mockUsers.find((candidate) => candidate.id === id))
const form = (overrides = {}) => ({
    fullName: 'Ana Lopez',
    email: 'ana.lopez@example.com',
    phone: '',
    purpose: 'Courtesy visit',
    date: '2026-11-03',
    startTime: '10:00',
    endTime: '11:00',
    internalNotes: '',
    ...overrides,
})
const fieldErrorsOf = async (promise) => {
    try {
        await promise
    } catch (error) {
        return error.details?.fieldErrors
    }
    return null
}

describe('createRequest: who and what is refused', () => {
    it('refuses without sign-in (401) and without permission (403)', async () => {
        const count = db.requests.length
        setMockActor(null)
        await expect(createRequest(form())).rejects.toMatchObject({ status: 401 })
        as('user-liza')
        await expect(createRequest(form())).rejects.toMatchObject({ status: 403 })
        expect(db.requests.length).toBe(count)
    })

    it('refuses a request with no email and no phone, and saves nothing (API-02)', async () => {
        as('user-marco')
        const count = db.requests.length
        const errors = await fieldErrorsOf(createRequest(form({ email: '', phone: '' })))
        expect(errors.email).toBe('Enter an email or a phone number.')
        expect(db.requests.length).toBe(count)
    })

    it('applies the office rules with specific messages (staff cannot bypass them)', async () => {
        as('user-marco')
        expect((await fieldErrorsOf(createRequest(form({ date: '2026-10-31' })))).date).toBe('The office is closed on that day.')
        expect((await fieldErrorsOf(createRequest(form({ startTime: '07:00', endTime: '08:00' })))).startTime).toBe('Outside office hours (8:00 AM–5:00 PM).')
        expect((await fieldErrorsOf(createRequest(form({ date: '2026-10-30', startTime: '13:00', endTime: '14:00' })))).startTime).toContain('Out of office')
        expect((await fieldErrorsOf(createRequest(form({ date: '2026-12-25' })))).date).toContain('Christmas Day')
    })

    it('validates the end time, the past, and the notes length', async () => {
        as('user-marco')
        expect((await fieldErrorsOf(createRequest(form({ endTime: '09:00' })))).endTime).toBe('The end time must be after the start time.')
        expect((await fieldErrorsOf(createRequest(form({ endTime: '' })))).endTime).toBe('Choose an end time.')
        expect((await fieldErrorsOf(createRequest(form({ date: '2026-10-25' })))).date).toBe('Choose a date that is not in the past.')
        expect((await fieldErrorsOf(createRequest(form({ internalNotes: 'x'.repeat(1001) })))).internalNotes).toContain('1000')
        expect((await fieldErrorsOf(createRequest(form({ fullName: ' ' })))).fullName).toBe("Enter the requester's full name.")
    })

    it('fails safely when the server fails, saving nothing', async () => {
        as('user-marco')
        const count = db.requests.length
        setSubmissionFault('server_error')
        await expect(createRequest(form())).rejects.toMatchObject({ status: 500 })
        setSubmissionFault('none')
        expect(db.requests.length).toBe(count)
    })
})

describe('createRequest: saving', () => {
    it('saves an in-person request with source, encoder, history, audit and acknowledgement (API-03)', async () => {
        as('user-marco')
        const before = (await getStatusCounts()).statusCounts.pending
        const total = db.requests.length
        const result = await createRequest(form({ internalNotes: '  Walked in; prefers mornings.  ' }))
        expect(result.referenceNumber).toBe('REQ-2026-0143')
        expect(result.acknowledgement).toBe('queued')
        expect(result.emailOnFile).toBe(true)
        expect(db.requests.length).toBe(total + 1)

        const request = db.requests.find((r) => r.id === result.id)
        expect(request).toMatchObject({
        source: 'in_person',
        status: 'pending',
        encodedBy: 'user-marco',
        requesterName: 'Ana Lopez',
        internalNotes: 'Walked in; prefers mornings.',
        preferredStartAt: '2026-11-03T10:00:00+08:00',
        preferredEndAt: '2026-11-03T11:00:00+08:00',
        })
        expect(db.statusHistory.find((h) => h.requestId === result.id)).toMatchObject({ oldStatus: null, newStatus: 'pending', changedBy: 'user-marco' })
        expect(db.auditLogs.some((a) => a.action === 'request.created' && a.entityId === result.id && a.userId === 'user-marco')).toBe(true)
        expect(db.notifications.some((n) => n.requestId === result.id && n.templateKey === 'acknowledgement' && n.status === 'queued')).toBe(true)
        expect((await getStatusCounts()).statusCounts.pending).toBe(before + 1)
        expect((await listRequests({})).total).toBe(total + 1)
    })

    it('gives each request its own reference number', async () => {
        as('user-marco')
        const first = await createRequest(form({ fullName: 'Pia Cruz', email: 'pia@example.com', date: '2026-11-04' }))
        const second = await createRequest(form({ fullName: 'Ric Tan', email: 'ric@example.com', date: '2026-11-04' }))
        expect(first.referenceNumber).not.toBe(second.referenceNumber)
    })

    it('saves a request with only a phone number, queuing no email', async () => {
        as('user-marco')
        const result = await createRequest(form({ fullName: 'Lito Ramos', email: '', phone: '0917 555 0100', date: '2026-11-05' }))
        expect(result.acknowledgement).toBe('none')
        expect(result.emailOnFile).toBe(false)
        expect(db.notifications.some((n) => n.requestId === result.id)).toBe(false)
    })

    it('queues no acknowledgement when the office turned it off, and still saves', async () => {
        as('user-marco')
        db.settings.sendAcknowledgement = false
        const result = await createRequest(form({ fullName: 'Nena Diaz', email: 'nena@example.com', date: '2026-11-05' }))
        db.settings.sendAcknowledgement = true
        expect(result.acknowledgement).toBe('none')
        expect(db.requests.some((r) => r.id === result.id)).toBe(true)
    })

    it('allows a time that overlaps a confirmed appointment, and says so', async () => {
        as('user-marco')
        const result = await createRequest(form({ fullName: 'Ben Uy', email: 'ben.uy@example.com', date: '2026-10-27', startTime: '09:30', endTime: '10:30' }))
        expect(result.timeMayBeUnavailable).toBe(true)
        expect(db.requests.find((r) => r.id === result.id).status).toBe('pending')
    })
})

describe('possible duplicates', () => {
    const juan = { fullName: 'Juan Dela Cruz', email: '', phone: '', date: '2026-10-28' }

    it('finds a pending request for the same person on the same date, ignoring case and spaces', async () => {
        as('user-marco')
        const found = await findPossibleDuplicates({ ...juan, fullName: '  juan   DELA cruz ' })
        expect(found.total).toBe(1)
        expect(found.items[0]).toMatchObject({ referenceNumber: 'REQ-2026-0141', requesterName: 'Juan Dela Cruz', status: 'pending' })
        expect(Object.keys(found.items[0]).sort()).toEqual(['id', 'preferredStartAt', 'referenceNumber', 'requesterName', 'status'])
    })

    it('does not warn for another person, another date, or a finished request', async () => {
        as('user-marco')
        expect((await findPossibleDuplicates({ ...juan, fullName: 'Someone Else' })).total).toBe(0)
        expect((await findPossibleDuplicates({ ...juan, date: '2026-11-10' })).total).toBe(0)
        // a rejected request is not a duplicate: pick one whose person has no other active request that day
        const day = (request) => request.preferredStartAt.slice(0, 10)
        const active = db.requests.filter((r) => r.status === 'pending' || r.status === 'confirmed')
        const rejected = db.requests.find(
        (r) => r.status === 'rejected' && !active.some((a) => a.requesterName === r.requesterName && day(a) === day(r)),
        )
        expect((await findPossibleDuplicates({ fullName: rejected.requesterName, email: '', phone: '', date: day(rejected) })).total).toBe(0)
        expect((await findPossibleDuplicates({ ...juan, fullName: '', date: '' })).total).toBe(0)
    })

    it('needs create permission to preview', async () => {
        as('user-liza')
        await expect(findPossibleDuplicates(juan)).rejects.toMatchObject({ status: 403 })
    })

    it('refuses saving a likely duplicate until staff acknowledge it (409), then saves', async () => {
        as('user-marco')
        const count = db.requests.length
        const values = form({ fullName: 'Juan Dela Cruz', email: '', phone: '0917 111 2222', date: '2026-10-28', startTime: '14:00', endTime: '15:00' })
        await expect(createRequest(values)).rejects.toMatchObject({ status: 409, code: 'possible_duplicate' })
        expect(db.requests.length).toBe(count)
        const result = await createRequest(values, { acknowledgeDuplicate: true })
        expect(db.requests.length).toBe(count + 1)
        expect(db.requests.find((r) => r.id === result.id).source).toBe('in_person')
    })

    it('matches on the same email or phone even when the name differs', async () => {
        as('user-marco')
        const found = await findPossibleDuplicates({ fullName: 'J. Dela Cruz', email: '', phone: '', date: '2026-10-28' })
        expect(found.total).toBe(0) // a different spelling alone is not enough
        const byPhone = db.requests.find((r) => r.requesterPhone && r.status === 'pending' && r.source === 'online')
        const date = byPhone.preferredStartAt.slice(0, 10)
        expect((await findPossibleDuplicates({ fullName: 'Another Name', email: '', phone: byPhone.requesterPhone, date })).total).toBe(1)
    })
})

describe('policy and the public form', () => {
    it('tells staff the default duration', async () => {
        as('user-marco')
        expect((await getSchedulingPolicy()).defaultDurationMinutes).toBe(60)
    })

    it('still saves an online request as before (source online, no encoder, acknowledgement queued)', async () => {
        const result = await submitRequest({ fullName: 'Online Person', email: 'online@example.com', phone: '', purpose: 'Visit', date: '2026-11-09', startTime: '09:00' })
        expect(result.acknowledgement).toBe('queued')
        const request = db.requests.find((r) => r.referenceNumber === result.referenceNumber)
        expect(request).toMatchObject({ source: 'online', encodedBy: null, status: 'pending', internalNotes: null })
    })

    it('queues no online acknowledgement when the office turned it off (fixed)', async () => {
        db.settings.sendAcknowledgement = false
        const result = await submitRequest({ fullName: 'Quiet Person', email: 'quiet@example.com', phone: '', purpose: 'Visit', date: '2026-11-10', startTime: '09:00' })
        db.settings.sendAcknowledgement = true
        expect(result.acknowledgement).toBe('none')
    })
})