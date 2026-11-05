import { ApiError } from './ApiError'
import { getReadFault } from './mockFaults'

const LATENCY_MS = 300

// Pretends to be a network call: waits a moment, then returns a COPY of the data
// (so screens can never change the in-memory database by accident).
// If the handler throws an ApiError, the returned promise rejects with it.
export async function mockApi(handler) {
    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS))
    if (getReadFault() === 'server_error') {
        throw new ApiError(500, 'server_error', 'Something went wrong.')
    }
    return structuredClone(handler())
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
