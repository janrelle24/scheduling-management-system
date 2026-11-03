// Fictional sample accounts (names/emails match the UI designs).
// Shape follows the Phase 2 `users` table, plus a `permissions` list.
import { PERMISSIONS as P } from '../utils/permissions'

export const mockUsers = [
    {
        id: 'user-elena',
        fullName: 'Elena Cruz',
        email: 'elena@office.gov.ph',
        role: 'administrator',
        isActive: true,
        permissions: [
        P.USERS_MANAGE,
        P.SETTINGS_MANAGE,
        P.AUDIT_LOGS_VIEW,
        P.EMAIL_NOTIFICATIONS_VIEW,
        P.REQUESTS_VIEW,
        P.APPOINTMENTS_VIEW,
        P.REPORTS_VIEW,
        ],
    },
    {
        id: 'user-marco',
        fullName: 'Marco Reyes',
        email: 'marco@office.gov.ph',
        role: 'staff',
        isActive: true,
        permissions: [
        P.REQUESTS_VIEW,
        P.REQUESTS_CREATE,
        P.APPOINTMENTS_VIEW,
        P.APPOINTMENTS_APPROVE,
        P.APPOINTMENTS_REJECT,
        ],
    },
    {
        id: 'user-liza',
        fullName: 'Liza Ramos',
        email: 'liza@office.gov.ph',
        role: 'staff',
        isActive: true,
        permissions: [P.REQUESTS_VIEW, P.APPOINTMENTS_VIEW, P.REPORTS_VIEW, P.REPORTS_EXPORT],
    },
    {
        id: 'user-ben',
        fullName: 'Ben Ortiz',
        email: 'ben@office.gov.ph',
        role: 'staff',
        isActive: false,
        permissions: [],
    },
]
