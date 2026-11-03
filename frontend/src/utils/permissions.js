// Permission keys. These match the API access rules in the Phase 2 document.
// requests.create and email_notifications.view are proposed names (approved for the frontend).
export const PERMISSIONS = {
    REQUESTS_VIEW: 'requests.view',
    REQUESTS_CREATE: 'requests.create',
    APPOINTMENTS_VIEW: 'appointments.view',
    APPOINTMENTS_APPROVE: 'appointments.approve',
    APPOINTMENTS_REJECT: 'appointments.reject',
    APPOINTMENTS_CANCEL: 'appointments.cancel',
    APPOINTMENTS_RESCHEDULE: 'appointments.reschedule',
    APPOINTMENTS_COMPLETE: 'appointments.complete',
    REPORTS_VIEW: 'reports.view',
    REPORTS_EXPORT: 'reports.export',
    SETTINGS_MANAGE: 'settings.manage',
    AUDIT_LOGS_VIEW: 'audit_logs.view',
    EMAIL_NOTIFICATIONS_VIEW: 'email_notifications.view',
    USERS_MANAGE: 'users.manage',
}

export function hasPermission(user, permission) {
    return Boolean(user && user.permissions.includes(permission))
}

  // True if the user has at least one of the listed permissions.
  // With no list, any signed-in user passes.
export function hasAnyPermission(user, permissions) {
    if (!user) return false
    if (!permissions || permissions.length === 0) return true
    return permissions.some((permission) => user.permissions.includes(permission))
}

  // NOTE: these checks only decide what the UI shows. They are NOT security.
  // The backend must check permissions on every request.
