import { PERMISSIONS as P } from './permissions'

// Which permissions a staff account or an administrator account may hold, and how the
// checkboxes on the Staff Accounts screen map onto them. Pure, so the screen and the (mock)
// server follow the SAME rules; the real backend must enforce them itself.

export const ROLES = [
    { value: 'staff', label: 'Staff' },
    { value: 'administrator', label: 'Administrator' },
]
export const ROLE_LABELS = { staff: 'Staff', administrator: 'Administrator' }

// An administrator always manages accounts and scheduling settings (Phase 1: "Administrator").
const ALWAYS_ADMIN = [P.USERS_MANAGE, P.SETTINGS_MANAGE]

// Staff may hold these. appointments.complete has no checkbox yet; it is kept when saving.
const STAFF_ALLOWED = [
    P.REQUESTS_VIEW,
    P.REQUESTS_CREATE,
    P.APPOINTMENTS_VIEW,
    P.APPOINTMENTS_APPROVE,
    P.APPOINTMENTS_REJECT,
    P.APPOINTMENTS_CANCEL,
    P.APPOINTMENTS_RESCHEDULE,
    P.APPOINTMENTS_COMPLETE,
    P.REPORTS_VIEW,
    P.REPORTS_EXPORT,
]

// Only administrators can be authorized for these ("if authorized", Phase 1).
const ADMIN_OPTIONAL = [P.AUDIT_LOGS_VIEW, P.EMAIL_NOTIFICATIONS_VIEW]

// The checkboxes. `keys` are the real permissions a box turns on and off; the box is
// ticked when the FIRST key is held. "View requests" also grants viewing appointments and the calendar.
export const PERMISSION_OPTIONS = [
    { id: 'view', label: 'View requests', hint: 'Also opens appointments and the calendar.', keys: [P.REQUESTS_VIEW, P.APPOINTMENTS_VIEW] },
    { id: 'encode', label: 'Encode in-person requests', keys: [P.REQUESTS_CREATE] },
    { id: 'approve', label: 'Approve requests', keys: [P.APPOINTMENTS_APPROVE] },
    { id: 'reject', label: 'Reject requests', keys: [P.APPOINTMENTS_REJECT] },
    { id: 'cancel', label: 'Cancel appointments', keys: [P.APPOINTMENTS_CANCEL] },
    { id: 'reschedule', label: 'Reschedule appointments', keys: [P.APPOINTMENTS_RESCHEDULE] },
    { id: 'reports', label: 'View reports', keys: [P.REPORTS_VIEW] },
    { id: 'export', label: 'Export reports', keys: [P.REPORTS_EXPORT] },
]
export const ADMIN_PERMISSION_OPTIONS = [
    { id: 'audit', label: 'View audit log', keys: [P.AUDIT_LOGS_VIEW] },
    { id: 'email', label: 'View email notifications', keys: [P.EMAIL_NOTIFICATIONS_VIEW] },
]

export const isOptionChecked = (option, permissions) => permissions.includes(option.keys[0])

// A new list with the box's permissions added or removed; every other permission is kept.
export function setOption(permissions, option, checked) {
    const others = permissions.filter((key) => !option.keys.includes(key))
    return checked ? [...others, ...option.keys] : others
}

export const allowedPermissions = (role) =>
    role === 'administrator' ? [...STAFF_ALLOWED, ...ADMIN_OPTIONAL, ...ALWAYS_ADMIN] : STAFF_ALLOWED

  // The permissions a role may actually hold:
  //   permissions: de-duplicated and sorted, with an administrator's fixed ones added
  //   invalid:     what was asked for but this role may not hold (the server refuses these)
export function normalizePermissions(role, permissions) {
    const allowed = allowedPermissions(role)
    const invalid = permissions.filter((key) => !allowed.includes(key))
    const kept = new Set(permissions.filter((key) => allowed.includes(key)))
    if (role === 'administrator') ALWAYS_ADMIN.forEach((key) => kept.add(key))
    return { permissions: [...kept].sort(), invalid }
}