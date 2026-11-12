import { describe, expect, it } from 'vitest'
import { db } from '../data/store'
import { DEMO_PASSWORD, checkResetToken, login, resetPassword } from './authService'
import { setMockActor } from './mockSession'
import { approveRequest, rejectRequest } from './requestService'
import { createUser, getUser, listUsers, setUserActive, updateUser } from './userService'

// Elena is the only administrator. Marco and Liza are staff, Ben is deactivated.
const as = (id) => setMockActor(db.users.find((candidate) => candidate.id === id)) // includes accounts created during the test
const stored = (id) => db.users.find((user) => user.id === id)
const audit = (action) => db.auditLogs.filter((row) => row.action === action)
const rejection = async (promise) => {
    try {
        await promise
    } catch (error) {
        return error
    }
    return null
}

describe('who may manage accounts', () => {
    it('refuses a staff member (403) and records the attempt as a security event (UC-07)', async () => {
        as('user-marco')
        const before = audit('security.access_denied').length
        expect((await rejection(listUsers())).status).toBe(403)
        expect((await rejection(createUser({ fullName: 'Sneaky Person', email: 'sneaky@office.gov.ph', role: 'administrator', permissions: [] }))).status).toBe(403)
        expect(db.users.some((u) => u.email === 'sneaky@office.gov.ph')).toBe(false)
        const added = audit('security.access_denied').slice(before)
        expect(added.length).toBe(2)
        expect(added[0]).toMatchObject({ userId: 'user-marco', details: { attempted: 'Account management', result: 'failed' } })
    })

    it('refuses when nobody is signed in (401)', async () => {
        setMockActor(null)
        expect((await rejection(listUsers())).status).toBe(401)
    })

    it('lets the administrator list and read accounts', async () => {
        as('user-elena')
        const { items, total } = await listUsers()
        expect(total).toBe(4)
        expect(items.map((u) => u.fullName)).toEqual(['Elena Cruz', 'Marco Reyes', 'Liza Ramos', 'Ben Ortiz'])
        expect((await getUser('user-marco')).permissions.includes('appointments.approve')).toBe(true)
        expect((await rejection(getUser('user-nobody'))).status).toBe(404)
    })
})

describe('createUser', () => {
    const valid = { fullName: '  Rina   Dela Paz ', email: ' Rina@Office.gov.ph ', role: 'staff', permissions: ['requests.view', 'appointments.view'] }

    it('validates name, email and role (422) and saves nothing', async () => {
        as('user-elena')
        const count = db.users.length
        const error = await rejection(createUser({ fullName: '', email: 'nope', role: 'boss', permissions: [] }))
        expect(error.status).toBe(422)
        expect(error.details.fieldErrors).toEqual({ fullName: 'Enter the full name.', email: 'Enter a valid work email.', role: 'Choose a role.' })
        expect(db.users.length).toBe(count)
    })

    it('refuses a duplicate email ignoring case and spaces, including a deactivated account (409)', async () => {
        as('user-elena')
        const live = await rejection(createUser({ ...valid, email: ' MARCO@office.gov.ph ' }))
        const deactivated = await rejection(createUser({ ...valid, email: 'ben@office.gov.ph' }))
        for (const error of [live, deactivated]) {
        expect(error.status).toBe(409)
        expect(error.code).toBe('duplicate_email')
        expect(error.details.fieldErrors.email).toBe('An account with this email already exists.')
        }
    })

    it('refuses permissions the role may not hold (422): a staff account with admin rights', async () => {
        as('user-elena')
        const count = db.users.length
        const error = await rejection(createUser({ ...valid, permissions: ['requests.view', 'users.manage'] }))
        expect(error).toMatchObject({ status: 422, code: 'invalid_permission' })
        expect((await rejection(createUser({ ...valid, permissions: ['made.up'] }))).code).toBe('invalid_permission')
        expect(db.users.length).toBe(count)
    })

    it('creates an account that cannot sign in until the invitation sets a password', async () => {
        as('user-elena')
        const result = await createUser(valid)
        expect(result.invitation).toBe('queued')
        expect(result.user).toMatchObject({ fullName: 'Rina Dela Paz', email: 'rina@office.gov.ph', role: 'staff', isActive: true })
        expect(result.user.permissions).toEqual(['appointments.view', 'requests.view'])
        expect('password' in result.user).toBe(false)
        expect(audit('user.created').some((row) => row.details.targetName === 'Rina Dela Paz' && row.userId === 'user-elena')).toBe(true)

        // not even the shared demo password works before they choose their own
        expect((await rejection(login({ email: 'rina@office.gov.ph', password: DEMO_PASSWORD }))).code).toBe('invalid_credentials')
        expect((await checkResetToken({ token: result.devInviteToken })).valid).toBe(true)
        await resetPassword({ token: result.devInviteToken, newPassword: 'rina-chose-this-one' })
        expect((await login({ email: 'rina@office.gov.ph', password: 'rina-chose-this-one' })).user.fullName).toBe('Rina Dela Paz')
        expect((await checkResetToken({ token: result.devInviteToken })).valid).toBe(false) // single use
    })

    it('gives an administrator the fixed permissions but NOT approval', async () => {
        as('user-elena')
        const { user } = await createUser({ fullName: 'Second Admin', email: 'second.admin@office.gov.ph', role: 'administrator', permissions: ['audit_logs.view'] })
        expect(user.permissions).toEqual(['audit_logs.view', 'settings.manage', 'users.manage'])
        expect(user.permissions.includes('appointments.approve')).toBe(false)
    })
})

describe('updateUser', () => {
    it('changes permissions, audits who changed what, and applies immediately to that person', async () => {
        as('user-elena')
        const before = audit('user.permissions_changed').length
        const result = await updateUser('user-marco', { fullName: 'Marco Reyes', role: 'staff', permissions: [...stored('user-marco').permissions, 'appointments.cancel'] })
        expect(result.changed).toBe(true)
        expect(result.user.permissions.includes('appointments.cancel')).toBe(true)
        const row = audit('user.permissions_changed').slice(before)[0]
        expect(row).toMatchObject({ userId: 'user-elena', details: { targetName: 'Marco Reyes', added: ['appointments.cancel'], removed: [] } })

        // the server reads the stored account on every request: Marco can now cancel? (no: he lacks reschedule) but his OTHER rights are intact
        as('user-marco')
        expect((await rejectRequest('req-0141', { reason: 'Not that week.' })).notification).toBe('queued')
    })

    it('takes a permission away at once, even for someone signed in', async () => {
        as('user-elena')
        await updateUser('user-marco', { fullName: 'Marco Reyes', role: 'staff', permissions: stored('user-marco').permissions.filter((k) => k !== 'appointments.approve') })
        as('user-marco') // already "signed in"
        const error = await rejection(approveRequest('req-0142', { startAt: '2026-10-27T10:00:00+08:00', endAt: '2026-10-27T11:00:00+08:00' }))
        expect(error.status).toBe(403)
        expect(stored('user-marco').permissions.includes('appointments.approve')).toBe(false)
    })

    it('records nothing when nothing changed', async () => {
        as('user-elena')
        const count = db.auditLogs.length
        const liza = stored('user-liza')
        const result = await updateUser('user-liza', { fullName: liza.fullName, role: 'staff', permissions: [...liza.permissions].reverse() })
        expect(result.changed).toBe(false)
        expect(db.auditLogs.length).toBe(count)
    })

    it('records a rename and a role change as an account update, and refuses bad input', async () => {
        as('user-elena')
        const liza = stored('user-liza')
        await updateUser('user-liza', { fullName: ' Liza  Ramos-Cruz ', role: 'staff', permissions: liza.permissions })
        expect(audit('user.updated').some((row) => row.details.targetName === 'Liza Ramos-Cruz' && row.details.changes.fullName.from === 'Liza Ramos')).toBe(true)
        expect((await rejection(updateUser('user-liza', { fullName: '', role: 'staff', permissions: [] }))).status).toBe(422)
        expect((await rejection(updateUser('user-liza', { fullName: 'Liza', role: 'staff', permissions: ['users.manage'] }))).code).toBe('invalid_permission')
        expect((await rejection(updateUser('user-nobody', { fullName: 'X Y', role: 'staff', permissions: [] }))).status).toBe(404)
    })
})

// Other tests create administrators, so these tests first make Elena the only ACTIVE one (and put it back).
function onlyElenaIsAdministrator() {
    const others = db.users.filter((u) => u.role === 'administrator' && u.id !== 'user-elena' && u.isActive)
    others.forEach((user) => {
        user.isActive = false
    })
    return () =>
        others.forEach((user) => {
        user.isActive = true
        })
}

describe('the last-administrator rule', () => {
    it('refuses to deactivate the only active administrator, and changes nothing', async () => {
        const restore = onlyElenaIsAdministrator()
        as('user-elena')
        const count = db.auditLogs.length
        const error = await rejection(setUserActive('user-elena', false))
        expect(error).toMatchObject({ status: 409, code: 'last_administrator', details: { action: 'deactivate' } })
        expect(error.message).toBe('Elena Cruz is the last active administrator. Assign another administrator first.')
        expect(stored('user-elena').isActive).toBe(true)
        expect(db.auditLogs.length).toBe(count)
        restore()
    })

    it('refuses to demote the only active administrator (409)', async () => {
        const restore = onlyElenaIsAdministrator()
        as('user-elena')
        const error = await rejection(updateUser('user-elena', { fullName: 'Elena Cruz', role: 'staff', permissions: ['requests.view'] }))
        expect(error).toMatchObject({ status: 409, code: 'last_administrator', details: { action: 'change_role' } })
        expect(stored('user-elena').role).toBe('administrator')
        restore()
    })

    it('allows it once a second administrator is active, and not again after that', async () => {
        const restore = onlyElenaIsAdministrator()
        as('user-elena')
        const { user: second } = await createUser({ fullName: 'Backup Admin', email: 'backup.admin@office.gov.ph', role: 'administrator', permissions: [] })
        expect((await setUserActive('user-elena', false)).user.isActive).toBe(false)
        expect(audit('user.deactivated').some((row) => row.details.targetName === 'Elena Cruz' && row.userId === 'user-elena')).toBe(true)

        // Elena's own session is over on her next request, and the backup admin is now the last one
        expect((await rejection(listUsers())).status).toBe(401)
        as(second.id)
        expect((await rejection(setUserActive(second.id, false))).code).toBe('last_administrator')
        expect((await setUserActive('user-elena', true)).user.isActive).toBe(true) // reactivate
        restore()
    })

    it('does not count a deactivated administrator', async () => {
        const restore = onlyElenaIsAdministrator()
        as('user-elena')
        const backup = db.users.find((u) => u.fullName === 'Backup Admin')
        backup.isActive = false
        expect((await rejection(setUserActive('user-elena', false))).code).toBe('last_administrator')
        backup.isActive = true
        restore()
    })
})

describe('deactivating and activating', () => {
    it('deactivates staff: they cannot sign in, and a session they already hold ends', async () => {
        as('user-elena')
        const result = await setUserActive('user-liza', false)
        expect(result).toMatchObject({ changed: true, user: { isActive: false } })
        expect((await rejection(login({ email: 'liza@office.gov.ph', password: DEMO_PASSWORD }))).code).toBe('invalid_credentials')
        as('user-liza') // her browser still thinks she is signed in
        expect(await rejection(listUsers())).toMatchObject({ status: 401, code: 'session_ended' })
    })

    it('activates again, and does nothing when the state is already right', async () => {
        as('user-elena')
        expect((await setUserActive('user-liza', true)).changed).toBe(true)
        expect(audit('user.activated').some((row) => row.details.targetName === 'Liza Ramos-Cruz')).toBe(true)
        expect((await login({ email: 'liza@office.gov.ph', password: DEMO_PASSWORD })).user.id).toBe('user-liza')
        expect((await setUserActive('user-liza', true)).changed).toBe(false)
    })
})
