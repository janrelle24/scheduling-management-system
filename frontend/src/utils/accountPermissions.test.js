import { describe, expect, it } from 'vitest'
import {
    ADMIN_PERMISSION_OPTIONS, PERMISSION_OPTIONS, isOptionChecked, normalizePermissions, setOption,
} from './accountPermissions'

const option = (id) => [...PERMISSION_OPTIONS, ...ADMIN_PERMISSION_OPTIONS].find((o) => o.id === id)

describe('checkboxes', () => {
    it('ticks a box when its first permission is held, and sets both permissions of "View requests"', () => {
        expect(isOptionChecked(option('view'), ['requests.view'])).toBe(true)
        expect(isOptionChecked(option('approve'), ['requests.view'])).toBe(false)
        expect(setOption([], option('view'), true).sort()).toEqual(['appointments.view', 'requests.view'])
        expect(setOption(['requests.view', 'appointments.view', 'reports.view'], option('view'), false)).toEqual(['reports.view'])
    })

    it('keeps permissions the screen has no box for', () => {
        const after = setOption(['appointments.complete', 'requests.view'], option('approve'), true)
        expect(after.includes('appointments.complete')).toBe(true)
        expect(after.includes('appointments.approve')).toBe(true)
    })
})

describe('normalizePermissions', () => {
    it('gives an administrator the fixed permissions and allows the optional admin ones', () => {
        const { permissions, invalid } = normalizePermissions('administrator', ['audit_logs.view'])
        expect(invalid).toEqual([])
        expect(permissions).toEqual(['audit_logs.view', 'settings.manage', 'users.manage'])
    })

    it('does NOT give an administrator approval by default', () => {
        expect(normalizePermissions('administrator', []).permissions.includes('appointments.approve')).toBe(false)
    })

    it('refuses admin-only and unknown permissions for staff, without keeping them', () => {
        const { permissions, invalid } = normalizePermissions('staff', ['requests.view', 'users.manage', 'audit_logs.view', 'made.up'])
        expect(permissions).toEqual(['requests.view'])
        expect(invalid.sort()).toEqual(['audit_logs.view', 'made.up', 'users.manage'])
    })

    it('removes duplicates and sorts', () => {
        expect(normalizePermissions('staff', ['reports.view', 'requests.view', 'reports.view']).permissions).toEqual(['reports.view', 'requests.view'])
    })

    it('drops the admin permissions when switching to staff, and adds them when switching to administrator', () => {
        const admin = normalizePermissions('administrator', ['requests.view']).permissions
        expect(normalizePermissions('staff', admin).permissions).toEqual(['requests.view'])
        expect(normalizePermissions('administrator', ['requests.view']).permissions.includes('users.manage')).toBe(true)
    })
})
