// DEVELOPMENT ONLY. The real backend knows who is calling from the sign-in token on every
// request. The mock services have no token, so the simulated session (SessionProvider)
// tells them who is "signed in". This is what lets the mock services refuse an action
// the way the server will: the screen checks are only for convenience, never security.
import { hasAnyPermission } from '../utils/permissions'
import { ApiError } from './ApiError'

let actor = null
let expired = false
let unauthorizedListener = null

export function setMockActor(user) {
    actor = user
    if (user) expired = false // signing in again starts a fresh session
}

// DEV: pretend the server ended the session (the timeout screen). Every call except the public
// ones then fails with 401, like a real API does once the session cookie has expired.
export function expireMockSession() {
    expired = true
}

export const isMockSessionExpired = () => expired

// The real app has one place that reacts to any 401: it clears the session and shows the
// "signed out" screen. SessionProvider registers that reaction here; mockApi triggers it.
export function onUnauthorized(listener) {
    unauthorizedListener = listener
    return () => {
        unauthorizedListener = null
    }
}

export function notifyUnauthorized() {
    unauthorizedListener?.()
}

// Returns the signed-in user, or throws 401 / 403 like the real API.
// `permissions` may be one key or a list (any one of them is enough).
export function requireActor(permissions) {
    if (!actor) throw new ApiError(401, 'unauthenticated', 'Please sign in again.')
    if (permissions && !hasAnyPermission(actor, [].concat(permissions))) {
        throw new ApiError(403, 'forbidden', "You don't have permission to do that.")
    }
    return actor
}
