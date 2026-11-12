import { ApiError } from './ApiError'
import { getReadFault } from './mockFaults'
import { isMockSessionExpired, notifyUnauthorized } from './mockSession'

const LATENCY_MS = 300

// Pretends to be a network call: waits a moment, then returns a COPY of the data
// (so screens can never change the in-memory database by accident).
// If the handler throws an ApiError, the returned promise rejects with it.
// { public: true } marks an endpoint that needs no sign-in.
export async function mockApi(handler, { public: isPublic = false } = {}) {
    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS))
    if (getReadFault() === 'server_error') {
        throw new ApiError(500, 'server_error', 'Something went wrong.')
    }
    try {
      // Public endpoints (sign-in, password recovery, the public request form) work without a session.
        if (!isPublic && isMockSessionExpired()) {
            throw new ApiError(401, 'session_expired', 'Your session timed out for security.')
        }
        return structuredClone(handler())
    } catch (error) {
      // A 401 on a protected call means "you are no longer signed in": the app signs out.
      // (A wrong password is a 401 on a PUBLIC call, so it does not trigger this.)
        if (error?.status === 401 && !isPublic) notifyUnauthorized()
        throw error
    }
}

// Shared by the list services: { items, page, pageSize, total }
export function paginate(rows, page = 1, pageSize = 10) {
  const start = (page - 1) * pageSize
    return { items: rows.slice(start, start + pageSize), page, pageSize, total: rows.length }
}

// True if the 'YYYY-MM-DD' date is inside the (optional) from/to range, inclusive.
export function inDateRange(dateStr, from, to) {
    return (!from || dateStr >= from) && (!to || dateStr <= to)
}
