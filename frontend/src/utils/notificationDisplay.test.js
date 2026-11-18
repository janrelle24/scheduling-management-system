import { describe, expect, it } from 'vitest'
import { failedBanner, nextRetryText } from './notificationDisplay'
import { readAuditParams } from './listParams'

const now = new Date('2026-10-26T10:15:00+08:00')

describe('nextRetryText', () => {
    it('shows a dash for a sent email and "Now" for a queued email that is due', () => {
        expect(nextRetryText({ status: 'sent', nextAttemptAt: null }, now)).toBe('—')
        expect(nextRetryText({ status: 'queued', nextAttemptAt: '2026-10-26T10:15:00+08:00' }, now)).toBe('Now')
        expect(nextRetryText({ status: 'queued', nextAttemptAt: '2026-10-26T05:11:00+08:00' }, now)).toBe('Now')
    })
    it('shows the time for a failed email, or for a queued one that is not due yet', () => {
        expect(nextRetryText({ status: 'failed', nextAttemptAt: '2026-10-26T11:00:00+08:00' }, now)).toBe('Oct 26, 11:00 AM')
        expect(nextRetryText({ status: 'queued', nextAttemptAt: '2026-10-26T12:00:00+08:00' }, now)).toBe('Oct 26, 12:00 PM')
    })
})

describe('failedBanner', () => {
    it('says nothing when nothing failed, and names the count and the reason otherwise', () => {
        expect(failedBanner(0, [])).toBe(null)
        expect(failedBanner(1, ['Mailbox unavailable'])).toBe('1 email failed: “Mailbox unavailable.” The request or appointment keeps its status; delivery is retried automatically.')
        expect(failedBanner(3, ['Mailbox unavailable', 'Timed out'])).toContain('3 emails failed: “Mailbox unavailable.” “Timed out.”')
        expect(failedBanner(2, [])).toContain('2 emails failed.')
    })
})

describe('readAuditParams', () => {
    const allowed = ['request.approved', 'auth.login_failed']
    it('reads good values and ignores bad ones', () => {
        const good = new URLSearchParams('q=marco&action=request.approved&dateFrom=2026-10-01&dateTo=2026-10-26&page=3')
        expect(readAuditParams(good, allowed)).toEqual({ q: 'marco', action: 'request.approved', dateFrom: '2026-10-01', dateTo: '2026-10-26', page: 3 })
        const bad = new URLSearchParams('action=drop.table&dateFrom=banana&page=-2')
        expect(readAuditParams(bad, allowed)).toEqual({ q: '', action: '', dateFrom: '', dateTo: '', page: 1 })
    })
})
