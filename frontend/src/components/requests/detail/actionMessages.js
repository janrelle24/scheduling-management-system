// Wording of the toasts shown after Approve, Reject, Cancel and Reschedule.
const TEXT = {
    approve: { done: 'Appointment confirmed.', short: 'Confirmed.', queued: 'Confirmation email queued.' },
    reject: { done: 'Request rejected.', short: 'Rejected.', queued: 'Rejection email queued.' },
    cancel: { done: 'Appointment cancelled.', short: 'Cancelled.', queued: 'Cancellation email queued.' },
    reschedule: { done: 'Appointment rescheduled.', short: 'Rescheduled.', queued: 'Update email queued.' },
}

// notification: 'queued' | 'failed' | 'none' (from the service). A failed email never changes
// the status, and a request without an email address simply is not notified.
export function outcomeToast(action, notification) {
    const text = TEXT[action]
    if (notification === 'failed') {
        return {
            tone: 'warning',
            title: text.short,
            message: 'The email could not be sent and will be retried. Status unchanged.',
        }
    }
    if (notification === 'none') {
        return { tone: 'success', title: text.done, message: 'No email on file, so the requester was not notified.' }
    }
    return { tone: 'success', title: text.done, message: text.queued }
}

// When the server says someone else got there first (or the appointment already ended).
export function describeStale(error) {
    if (error.code === 'already_ended') {
        return { title: 'Not changed.', message: 'That appointment has already ended. Showing its latest status.' }
    }
    return {
        title: 'Already handled.',
        message: 'Another staff member already handled this. Showing its latest status.',
    }
}

// Error codes that mean "the record is no longer in the state you were looking at".
export const STALE_CODES = ['not_pending', 'not_active', 'already_ended']