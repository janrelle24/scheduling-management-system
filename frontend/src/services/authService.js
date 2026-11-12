// SIMULATED authentication (development only). The real backend verifies a password HASH, sets a
// secure HttpOnly session cookie, rate-limits sign-in and recovery, and sends the reset email.
// Nothing here is secure: it only lets every screen and error path be built and tested now.
//
// Mirrors: POST /auth/login, POST /auth/logout, POST /auth/forgot-password, GET and POST for
// the reset link (check, then POST /auth/reset-password). All of these are PUBLIC endpoints.
import { db } from '../data/store'
import { getNow } from '../utils/clock'
import { plusMinutes, toManilaIso } from '../utils/datetime'
import { validateForgotPassword, validateNewPassword, validateSignIn } from '../utils/validators'
import { ApiError } from './ApiError'
import { nowIso } from './decisions'
import { mockApi } from './mockApi'

// DEV ONLY: the one fake password every mock account starts with. It is NOT a secret and
// is shown on the sign-in screen in development builds. A password reset replaces it in memory.
export const DEMO_PASSWORD = 'demo-password-2026'

// Development helpers (the demo password hint, the reset link on "Check your email").
// They are switched off in production builds.
export const SHOW_DEV_HELPERS = import.meta.env?.DEV ?? true

const RESET_LINK_MINUTES = 60
const passwordsSetByReset = new Map() // userId -> password chosen through a reset (plain text: mock only)
const resetTokens = new Map() // token -> { userId, expiresAt }

const normalizeEmail = (email) => (email ?? '').trim().toLowerCase()
const findActiveUser = (email) =>
    db.users.find((user) => user.isActive && user.email.toLowerCase() === normalizeEmail(email))

function validationError(fieldErrors) {
    return new ApiError(422, 'validation_failed', 'Please correct the highlighted fields.', { fieldErrors })
}

// POST /auth/login  { email, password } -> { user }   (like GET /auth/me)
// An unknown email, a wrong password and a deactivated account (UC-07) all give the SAME answer,
// so the screen cannot be used to find out which accounts exist. Failures are audited with the
// email but NEVER the password.
export function login({ email, password }) {
    return mockApi(
        () => {
            const fieldErrors = validateSignIn({ email: email ?? '', password: password ?? '' })
            if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors)
    
            const user = findActiveUser(email)
            const expected = user ? (passwordsSetByReset.get(user.id) ?? DEMO_PASSWORD) : null
            if (!user || password !== expected) {
            db.auditLogs.push({
                id: `aud-new-${db.auditLogs.length + 1}`,
                userId: null,
                action: 'auth.login_failed',
                entityType: 'user',
                entityId: null,
                details: { email: normalizeEmail(email).slice(0, 255), result: 'failed' },
                ipAddress: null,
                createdAt: nowIso(),
            })
            throw new ApiError(401, 'invalid_credentials', 'Incorrect email or password. Try again.')
            }
            return {
            user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role, permissions: user.permissions },
            }
        },
        { public: true },
    )
}

// POST /auth/logout. The simulated session lives in the React state; nothing to end on the "server".
export function logout() {
    return mockApi(() => ({ ok: true }), { public: true })
}

// POST /auth/forgot-password  { email } -> { ok: true }
// The answer is identical whether or not the account exists. Only a real, active account gets a
// single-use link (a newer link replaces an older one). The real backend emails it.
// In development builds the response also carries the link's token, since no email is sent.
export function forgotPassword({ email }) {
    return mockApi(
        () => {
            const fieldErrors = validateForgotPassword({ email: email ?? '' })
            if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors)
    
            const user = findActiveUser(email)
            if (!user) return { ok: true }
    
            for (const [token, entry] of resetTokens) if (entry.userId === user.id) resetTokens.delete(token)
            const token = `reset-${globalThis.crypto.randomUUID()}`
            resetTokens.set(token, {
            userId: user.id,
            expiresAt: plusMinutes(toManilaIso(getNow()), RESET_LINK_MINUTES),
            })
            return SHOW_DEV_HELPERS ? { ok: true, devResetToken: token } : { ok: true }
        },
        { public: true },
    )
}

// A token works only if it exists, has not expired, and its account is still active.
// "Invalid" and "expired" look the same on purpose.
function findUsableToken(token) {
    const entry = resetTokens.get(token)
    if (!entry || new Date(entry.expiresAt) <= getNow()) return null
    const user = db.users.find((candidate) => candidate.id === entry.userId && candidate.isActive)
    return user ? entry : null
}


// Opening the reset link: is it still good? -> { valid }
export function checkResetToken({ token }) {
    return mockApi(() => ({ valid: Boolean(token && findUsableToken(token)) }), { public: true })
}

// POST /auth/reset-password  { token, newPassword } -> { ok: true }
// Errors: 400 invalid_token (unknown, used or expired), 422 (password rule).
// The token is checked first, so a bad link learns nothing about the password rule.
// Success spends the token (single use) and every other link of that account.
export function resetPassword({ token, newPassword }) {
    return mockApi(
        () => {
            const entry = token ? findUsableToken(token) : null
            if (!entry) throw new ApiError(400, 'invalid_token', 'This reset link is invalid or has expired.')
    
            const passwordError = validateNewPassword(newPassword ?? '')
            if (passwordError) throw validationError({ newPassword: passwordError })
    
            passwordsSetByReset.set(entry.userId, newPassword)
            for (const [other, otherEntry] of resetTokens) if (otherEntry.userId === entry.userId) resetTokens.delete(other)
            return { ok: true }
        },
        { public: true },
    )
}