import { describe, expect, it } from 'vitest'
import { db } from '../data/store'
import { mockUsers } from '../data/mockUsers'
import { DEMO_PASSWORD, checkResetToken, forgotPassword, login, resetPassword } from './authService'
import { expireMockSession, onUnauthorized, setMockActor } from './mockSession'
import { listRequests, rejectRequest } from './requestService'

const failedLogins = () => db.auditLogs.filter((a) => a.action === 'auth.login_failed')
const rejection = async (promise) => {
    try {
        await promise
    } catch (error) {
        return error
    }
    return null
}

describe('login', () => {
    it('signs in with the email and password, ignoring case and spaces, and returns the account like GET /auth/me', async () => {
        const result = await login({ email: '  Marco@Office.GOV.PH ', password: DEMO_PASSWORD })
        expect(result.user).toMatchObject({ id: 'user-marco', fullName: 'Marco Reyes', role: 'staff' })
        expect(result.user.permissions.includes('appointments.approve')).toBe(true)
        expect('password' in result.user || 'passwordHash' in result.user).toBe(false)
    })

    it('gives the SAME answer for a wrong password, an unknown email and a deactivated account', async () => {
        const wrong = await rejection(login({ email: 'marco@office.gov.ph', password: 'not-the-password' }))
        const unknown = await rejection(login({ email: 'nobody@office.gov.ph', password: DEMO_PASSWORD }))
        const deactivated = await rejection(login({ email: 'ben@office.gov.ph', password: DEMO_PASSWORD })) // Ben is inactive (UC-07)
        for (const error of [wrong, unknown, deactivated]) {
            expect(error.status).toBe(401)
            expect(error.code).toBe('invalid_credentials')
            expect(error.message).toBe('Incorrect email or password. Try again.')
        }
    })

    it('audits each failure with the email, never the password, and nothing for a success', async () => {
        const before = failedLogins().length
        await rejection(login({ email: 'Liza@office.gov.ph', password: 'secret-attempt-123' }))
        await login({ email: 'liza@office.gov.ph', password: DEMO_PASSWORD })
        const added = failedLogins().slice(before)
        expect(added.length).toBe(1)
        expect(added[0]).toMatchObject({ userId: null, details: { email: 'liza@office.gov.ph', result: 'failed' } })
        expect(JSON.stringify(db.auditLogs).includes('secret-attempt-123')).toBe(false)
        expect(JSON.stringify(db.auditLogs).includes(DEMO_PASSWORD)).toBe(false)
    })

    it('asks for the missing fields (422) without recording a failed sign-in', async () => {
        const before = failedLogins().length
        const error = await rejection(login({ email: '', password: '' }))
        expect(error.status).toBe(422)
        expect(error.details.fieldErrors).toEqual({ email: 'Enter your email.', password: 'Enter your password.' })
        expect(failedLogins().length).toBe(before)
    })
})

describe('forgot and reset password', () => {
    it('answers the same for a real and an invented address, and only a real active account gets a link', async () => {
        const real = await forgotPassword({ email: 'marco@office.gov.ph' })
        const invented = await forgotPassword({ email: 'nobody@office.gov.ph' })
        const deactivated = await forgotPassword({ email: 'ben@office.gov.ph' })
        expect(real.ok && invented.ok && deactivated.ok).toBe(true)
        expect(typeof real.devResetToken).toBe('string')
        expect(invented.devResetToken).toBe(undefined)
        expect(deactivated.devResetToken).toBe(undefined)
    })

    it('rejects an empty or malformed email (422)', async () => {
        expect((await rejection(forgotPassword({ email: '' }))).details.fieldErrors.email).toBe('Enter your work email.')
        expect((await rejection(forgotPassword({ email: 'not-an-email' }))).details.fieldErrors.email).toBe('Enter a valid email address.')
    })

    it('checks a link: good, unknown, and missing', async () => {
        const { devResetToken } = await forgotPassword({ email: 'liza@office.gov.ph' })
        expect((await checkResetToken({ token: devResetToken })).valid).toBe(true)
        expect((await checkResetToken({ token: 'reset-made-up' })).valid).toBe(false)
        expect((await checkResetToken({ token: '' })).valid).toBe(false)
        expect((await checkResetToken({ token: undefined })).valid).toBe(false)
    })

    it('refuses a bad link first (400), then a weak password (422), and changes nothing for either', async () => {
        const { devResetToken } = await forgotPassword({ email: 'elena@office.gov.ph' })
        expect((await rejection(resetPassword({ token: 'reset-made-up', newPassword: 'short' }))).code).toBe('invalid_token')
        expect((await rejection(resetPassword({ token: devResetToken, newPassword: 'too-short' }))).details.fieldErrors.newPassword).toBe('Use at least 12 characters.')
        expect((await rejection(resetPassword({ token: devResetToken, newPassword: 'x'.repeat(129) }))).details.fieldErrors.newPassword).toBe('Use 128 characters or fewer.')
        expect((await login({ email: 'elena@office.gov.ph', password: DEMO_PASSWORD })).user.id).toBe('user-elena')
        expect((await checkResetToken({ token: devResetToken })).valid).toBe(true) // still usable after a refused attempt
    })

    it('resets the password: the new one works, the old one stops, and the link is single-use', async () => {
        const { devResetToken } = await forgotPassword({ email: 'marco@office.gov.ph' })
        expect((await resetPassword({ token: devResetToken, newPassword: 'a-brand-new-passphrase' })).ok).toBe(true)
        expect((await login({ email: 'marco@office.gov.ph', password: 'a-brand-new-passphrase' })).user.id).toBe('user-marco')
        expect((await rejection(login({ email: 'marco@office.gov.ph', password: DEMO_PASSWORD }))).status).toBe(401)
        expect((await rejection(resetPassword({ token: devResetToken, newPassword: 'another-new-passphrase' }))).code).toBe('invalid_token')
        expect((await checkResetToken({ token: devResetToken })).valid).toBe(false)
    })

    it('lets a newer link replace an older one', async () => {
        const first = await forgotPassword({ email: 'liza@office.gov.ph' })
        const second = await forgotPassword({ email: 'liza@office.gov.ph' })
        expect((await checkResetToken({ token: first.devResetToken })).valid).toBe(false)
        expect((await checkResetToken({ token: second.devResetToken })).valid).toBe(true)
    })

    it('stops a link working if the account has been deactivated since', async () => {
        const { devResetToken } = await forgotPassword({ email: 'liza@office.gov.ph' })
        const liza = db.users.find((u) => u.id === 'user-liza')
        liza.isActive = false
        expect((await checkResetToken({ token: devResetToken })).valid).toBe(false)
        expect((await rejection(resetPassword({ token: devResetToken, newPassword: 'a-valid-new-passphrase' }))).code).toBe('invalid_token')
        liza.isActive = true
    })
})

describe('session expiry (the timeout screen)', () => {
    it('fails every protected call with 401 once the session is expired, and tells the app', async () => {
        setMockActor(mockUsers.find((u) => u.id === 'user-marco'))
        let notified = 0
        const stop = onUnauthorized(() => {
            notified += 1
    })
      expect((await listRequests({})).total > 0).toBe(true) // works while signed in
        expireMockSession()
        const error = await rejection(listRequests({}))
        expect(error).toMatchObject({ status: 401, code: 'session_expired' })
        expect(notified).toBe(1)

      // public endpoints still work, and a wrong password is NOT treated as a timeout
        expect((await rejection(login({ email: 'marco@office.gov.ph', password: 'nope' }))).code).toBe('invalid_credentials')
        expect((await forgotPassword({ email: 'nobody@office.gov.ph' })).ok).toBe(true)
        expect(notified).toBe(1)

      // signing in again starts a fresh session
        setMockActor(mockUsers.find((u) => u.id === 'user-marco'))
        expect((await listRequests({})).total > 0).toBe(true)
        stop()
    })

    it('also signs the app out when a protected call finds nobody signed in', async () => {
        let notified = 0
        const stop = onUnauthorized(() => {
            notified += 1
        })
        setMockActor(null)
        expect((await rejection(rejectRequest('req-0141', { reason: 'x' }))).status).toBe(401)
        expect(notified).toBe(1)
        stop()
    })
})