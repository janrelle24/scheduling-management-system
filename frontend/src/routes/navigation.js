import { hasAnyPermission, PERMISSIONS as P } from '../utils/permissions'

// One list drives the desktop sidebar, the mobile tabs and the "More" page.
// requiresAny: the user needs at least one of these permissions (none = any signed-in user).
export const NAV_ITEMS = [
    { key: 'dashboard', label: 'Dashboard', to: '/dashboard', section: 'main', mobileTab: true },
    {
        key: 'requests',
        label: 'Requests & Appointments',
        mobileLabel: 'Requests',
        to: '/requests',
        section: 'main',
        mobileTab: true,
        requiresAny: [P.REQUESTS_VIEW, P.APPOINTMENTS_VIEW],
    },
    {
        key: 'calendar',
        label: 'Calendar',
        to: '/calendar',
        section: 'main',
        mobileTab: true,
        requiresAny: [P.APPOINTMENTS_VIEW],
    },
    {
        key: 'reports',
        label: 'Reports',
        to: '/reports',
        section: 'main',
        mobileTab: true,
        requiresAny: [P.REPORTS_VIEW],
    },
    {
        key: 'staffAccounts',
        label: 'Staff Accounts',
        to: '/admin/staff-accounts',
        section: 'admin',
        requiresAny: [P.USERS_MANAGE],
    },
    {
        key: 'settings',
        label: 'Scheduling Settings',
        to: '/admin/settings',
        section: 'admin',
        requiresAny: [P.SETTINGS_MANAGE],
    },
    {
        key: 'auditLog',
        label: 'Audit Log',
        to: '/admin/audit-log',
        section: 'admin',
        requiresAny: [P.AUDIT_LOGS_VIEW],
    },    
]

// Same items by key, so routes can reuse the same permission rules: NAV.calendar
export const NAV = Object.fromEntries(NAV_ITEMS.map((item) => [item.key, item]))

export function getVisibleNavItems(user) {
    return NAV_ITEMS.filter((item) => hasAnyPermission(user, item.requiresAny))
}
