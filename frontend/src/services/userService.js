// Mirrors: GET /api/v1/users  (create/update come with the Staff Accounts feature)
import { db } from '../data/store'
import { normalizePermissions } from '../utils/accountPermissions'
import { PERMISSIONS } from '../utils/permissions'
import { validateAccountForm } from '../utils/validators'
import { ApiError } from './ApiError'
import { SHOW_DEV_HELPERS, issueInvitation } from './authService'
import { nowIso } from './decisions'
import { mockApi } from './mockApi'
import { getMockActor, requireActor } from './mockSession'

const normalizeEmail = (email) => email.trim().toLowerCase() // emails are unique ignoring case and spaces
const cleanName = (name) => name.trim().replace(/\s+/g, ' ')
const toAccount = ({ id, fullName, email, role, isActive, permissions }) => ({
    id,
    fullName,
    email,
    role,
    isActive,
    permissions: [...permissions],
})

function writeAudit(actorId, action, details) {
    db.auditLogs.push({
        id: `aud-new-${db.auditLogs.length + 1}`,
        userId: actorId,
        action,
        entityType: 'user',
        entityId: details.targetId ?? null,
        details,
        ipAddress: null,
        createdAt: nowIso(),
    })
}

function requireManager() {
    try {
        return requireActor(PERMISSIONS.USERS_MANAGE)
    } catch (error) {
        const actor = getMockActor()
        if (error.status === 403 && actor) {
            writeAudit(actor.id, 'security.access_denied', { attempted: 'Account management', result: 'failed' })
        }
        throw error
    }
}

function validationError(fieldErrors) {
    return new ApiError(422, 'validation_failed', 'Please correct the highlighted fields.', { fieldErrors })
}

// Unknown permissions, or ones the role may not hold (e.g. a staff account with users.manage).
function checkedPermissions(role, permissions) {
    const result = normalizePermissions(role, permissions ?? [])
    if (result.invalid.length > 0) {
        throw new ApiError(422, 'invalid_permission', 'Invalid role or permission assignment.', {
            fieldErrors: { permissions: 'One or more permissions cannot be given to this role.' },
            invalid: result.invalid,
        })
    }
    return result.permissions
}

// The office must always keep an active administrator (UC-07, "last required administrator").
// In the real backend this check runs inside the same locked transaction as the change, so two
// administrators deactivating each other at the same moment cannot leave nobody.
function refuseIfLastAdministrator(user, action) {
    const activeAdministrators = db.users.filter((u) => u.role === 'administrator' && u.isActive)
    if (user.role === 'administrator' && user.isActive && activeAdministrators.length === 1) {
        throw new ApiError(
            409,
            'last_administrator',
            `${user.fullName} is the last active administrator. Assign another administrator first.`,
            { action },
        )
    }
}

const findUser = (id) => {
    const user = db.users.find((row) => row.id === id)
    if (!user) throw new ApiError(404, 'not_found', 'Account not found.')
    return user
}

const sameList = (a, b) => a.length === b.length && a.every((value, index) => value === b[index])

// GET /users -> { items, total }
export function listUsers() {
    return mockApi(() => {
        requireManager()
        return { items: db.users.map(toAccount), total: db.users.length }
    })
}

// GET /users/:id
export function getUser(id) {
    return mockApi(() => {
        requireManager()
        return toAccount(findUser(id))
    })
}

// POST /users  { fullName, email, role, permissions }
// -> { user, invitation: 'queued', devInviteToken? }
// 422 validation / invalid permission, 409 duplicate_email. The person chooses their own password
// through the invitation link; until then they cannot sign in.
export function createUser({ fullName, email, role, permissions }) {
    return mockApi(() => {
        const actor = requireManager()
        const fieldErrors = validateAccountForm({ fullName, email, role })
        if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors)

    const normalizedEmail = normalizeEmail(email)
        if (db.users.some((user) => normalizeEmail(user.email) === normalizedEmail)) {
            throw new ApiError(409, 'duplicate_email', 'An account with this email already exists.', {
            fieldErrors: { email: 'An account with this email already exists.' },
            })
        }
    const granted = checkedPermissions(role, permissions)

    const user = {
        id: `user-new-${db.users.length + 1}`,
        fullName: cleanName(fullName),
        email: normalizedEmail,
        role,
        isActive: true,
        permissions: granted,
    }
    db.users.push(user)
    writeAudit(actor.id, 'user.created', { targetId: user.id, targetName: user.fullName, role })
    const token = issueInvitation(user.id)
    return SHOW_DEV_HELPERS
        ? { user: toAccount(user), invitation: 'queued', devInviteToken: token }
        : { user: toAccount(user), invitation: 'queued' }
    })
}

// PATCH /users/:id (+ PUT /users/:id/permissions in one save)  { fullName, role, permissions }
// -> { user, changed }. Refuses to demote the last active administrator.
export function updateUser(id, { fullName, role, permissions }) {
    return mockApi(() => {
        const actor = requireManager()
        const user = findUser(id)
        const fieldErrors = validateAccountForm({ fullName, role }, { requireEmail: false })
        if (Object.keys(fieldErrors).length > 0) throw validationError(fieldErrors)
    
        if (role !== 'administrator') refuseIfLastAdministrator(user, 'change_role')
        const granted = checkedPermissions(role, permissions)
        const newName = cleanName(fullName)
    
        const nameChanged = newName !== user.fullName
        const roleChanged = role !== user.role
        const before = [...user.permissions].sort()
        const permissionsChanged = !sameList(before, granted)
        if (!nameChanged && !roleChanged && !permissionsChanged) return { user: toAccount(user), changed: false }
    
        const previous = { fullName: user.fullName, role: user.role }
        user.fullName = newName
        user.role = role
        user.permissions = granted
        if (nameChanged || roleChanged) {
            writeAudit(actor.id, 'user.updated', {
            targetId: user.id,
            targetName: user.fullName,
            changes: {
                ...(nameChanged ? { fullName: { from: previous.fullName, to: newName } } : {}),
                ...(roleChanged ? { role: { from: previous.role, to: role } } : {}),
            },
            })
        }
        if (permissionsChanged) {
            writeAudit(actor.id, 'user.permissions_changed', {
            targetId: user.id,
            targetName: user.fullName,
            added: granted.filter((key) => !before.includes(key)),
            removed: before.filter((key) => !granted.includes(key)),
            })
        }
        return { user: toAccount(user), changed: true }
    })
}

// PATCH /users/:id  { isActive }  -> { user, changed }
// A deactivated account keeps its history and cannot sign in; its next request fails with 401.
// Refuses to deactivate the last active administrator.
export function setUserActive(id, isActive) {
    return mockApi(() => {
        const actor = requireManager()
        const user = findUser(id)
        if (user.isActive === isActive) return { user: toAccount(user), changed: false }
        if (!isActive) refuseIfLastAdministrator(user, 'deactivate')
    
        user.isActive = isActive
        writeAudit(actor.id, isActive ? 'user.activated' : 'user.deactivated', {
            targetId: user.id,
            targetName: user.fullName,
        })
        return { user: toAccount(user), changed: true }
    })
}

