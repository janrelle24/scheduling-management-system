import { describe, expect, it } from 'vitest'
import { buildTimeline } from './requestTimeline'

// Same shape the API returns for GET /appointment-requests/:id.
const maria = {
    source: 'online',
    statusHistory: [
        { id: 'h1', oldStatus: null, newStatus: 'pending', changedByName: null, reason: null, changedAt: '2026-10-26T08:12:00+08:00' },
    ],
    notifications: [
        { id: 'n1', templateKey: 'acknowledgement', status: 'sent', createdAt: '2026-10-26T08:12:00+08:00', sentAt: '2026-10-26T08:12:00+08:00' },
        { id: 'n2', templateKey: 'reschedule', status: 'failed', createdAt: '2026-10-26T08:20:00+08:00', sentAt: null },
    ],
    activity: [
        { id: 'a1', action: 'request.viewed', actorName: 'Marco Reyes', createdAt: '2026-10-26T09:05:00+08:00' },
        { id: 'a2', action: 'request.approved', actorName: 'Marco Reyes', createdAt: '2026-10-26T09:10:00+08:00' },
    ],
}

describe('buildTimeline', () => {
    it('merges status changes, sent emails and views in time order', () => {
        expect(buildTimeline(maria).map((event) => event.title)).toEqual([
        'Submitted online → Pending',
        'Acknowledgement email sent',
        'Viewed by Marco Reyes',
        ])
    })

    it('leaves out failed emails and audit actions other than views', () => {
        const titles = buildTimeline(maria).map((event) => event.title)
        expect(titles.some((title) => title.includes('Reschedule'))).toBe(false)
        expect(titles.some((title) => title.includes('approved'))).toBe(false)
    })

    it('names the actor as System when nobody made the change', () => {
        expect(buildTimeline(maria)[0].actor).toBe('System')
    })

    it('words an in-person request differently', () => {
        const events = buildTimeline({ ...maria, source: 'in_person', notifications: [], activity: [] })
        expect(events[0].title).toBe('Encoded in person → Pending')
    })

    it('labels decisions and keeps the reason', () => {
        const events = buildTimeline({
        source: 'online',
        statusHistory: [
            { id: 'h1', oldStatus: null, newStatus: 'pending', changedAt: '2026-10-23T10:00:00+08:00' },
            { id: 'h2', oldStatus: 'pending', newStatus: 'rejected', changedByName: 'Marco Reyes', reason: 'Out of office.', changedAt: '2026-10-25T11:30:00+08:00' },
            { id: 'h3', oldStatus: 'confirmed', newStatus: 'confirmed', changedByName: 'Marco Reyes', reason: 'Rescheduled to a new time', changedAt: '2026-10-26T09:12:00+08:00' },
        ],
        })
        expect(events[1]).toMatchObject({ title: 'Rejected', actor: 'Marco Reyes', reason: 'Out of office.' })
        expect(events[2].title).toBe('Rescheduled')
    })

    it('orders by real time even when the offsets differ', () => {
        const events = buildTimeline({
        source: 'online',
        statusHistory: [
            { id: 'late', oldStatus: null, newStatus: 'pending', changedAt: '2026-10-26T01:00:00+00:00' }, // 09:00 Manila
            { id: 'early', oldStatus: 'pending', newStatus: 'rejected', changedAt: '2026-10-26T08:30:00+08:00' }, // 00:30 UTC
        ],
        })
        expect(events.map((event) => event.id)).toEqual(['early', 'late'])
    })

    it('copes with empty records', () => {
        expect(buildTimeline({ source: 'online' })).toEqual([])
    })
})
