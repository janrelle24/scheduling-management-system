// The error shape the backend will return (see Phase 2 API tests):
// 403 no permission, 404 not found, 409 conflict, 422 validation failed.
// Screens should handle errors through this shape, so nothing changes with the real API.
export class ApiError extends Error {
    constructor(status, code, message, details = null) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.code = code
        this.details = details
    }
}
