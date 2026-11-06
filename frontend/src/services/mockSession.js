// DEVELOPMENT ONLY. The real backend knows who is calling from the sign-in token on every
// request. The mock services have no token, so the simulated session (SessionProvider)
// tells them who is "signed in". This is what lets the mock services refuse an action
// the way the server will: the screen checks are only for convenience, never security.
import { hasAnyPermission } from '../utils/permissions'
import { ApiError } from './ApiError'

let actor = null

export function setMockActor(user) {
    actor = user
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
