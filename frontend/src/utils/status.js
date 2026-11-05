// A request and its appointment each have their own status (Phase 2):
//   request:     pending, confirmed, rejected, cancelled
//   appointment: confirmed, cancelled, completed
// The screens show ONE status per row. If an appointment exists we show its status
// (so a finished one reads "Completed"); otherwise we show the request's status.
export const DISPLAY_STATUSES = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed']

export function getDisplayStatus(request, appointment) {
    return appointment ? appointment.status : request.status
}

export const STATUS_LABELS = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    completed: 'Completed',
}

export const SOURCE_LABELS = { online: 'Online', in_person: 'In-person' }

// An appointment can only be confirmed, cancelled or completed (Phase 2).
export const APPOINTMENT_STATUSES = ['confirmed', 'cancelled', 'completed']