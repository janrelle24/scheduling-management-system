import { describe, expect, it } from 'vitest'
import { validateForgotPassword, validateNewPassword, validateResetForm, validateSignIn } from './validators'

describe('validateSignIn', () => {
    it('accepts an email and a password', () => {
        expect(validateSignIn({ email: 'marco@office.gov.ph', password: 'x' })).toEqual({})
    })
    it('names what is missing or malformed', () => {
        expect(validateSignIn({ email: '', password: '' })).toEqual({ email: 'Enter your email.', password: 'Enter your password.' })
        expect(validateSignIn({ email: 'marco', password: 'x' }).email).toBe('Enter a valid email address.')
    })
    it('does not trim the password (spaces can be part of it)', () => {
        expect(validateSignIn({ email: 'a@b.co', password: '   ' })).toEqual({})
    })
})

describe('validateForgotPassword', () => {
    it('needs a valid work email', () => {
        expect(validateForgotPassword({ email: 'marco@office.gov.ph' })).toEqual({})
        expect(validateForgotPassword({ email: ' ' }).email).toBe('Enter your work email.')
        expect(validateForgotPassword({ email: 'marco@' }).email).toBe('Enter a valid email address.')
    })
})

describe('password rules', () => {
    it('requires 12 to 128 characters and nothing else', () => {
        expect(validateNewPassword('x'.repeat(11))).toBe('Use at least 12 characters.')
        expect(validateNewPassword('x'.repeat(12))).toBe(undefined)
        expect(validateNewPassword('only lowercase words are fine')).toBe(undefined)
        expect(validateNewPassword('x'.repeat(128))).toBe(undefined)
        expect(validateNewPassword('x'.repeat(129))).toBe('Use 128 characters or fewer.')
    })
    it('checks the confirmation', () => {
        expect(validateResetForm({ newPassword: 'a-long-enough-one', confirmPassword: 'a-long-enough-one' })).toEqual({})
        expect(validateResetForm({ newPassword: 'a-long-enough-one', confirmPassword: '' }).confirmPassword).toBe('Confirm your new password.')
        expect(validateResetForm({ newPassword: 'a-long-enough-one', confirmPassword: 'different-one-here' }).confirmPassword).toBe('Passwords do not match.')
        expect(validateResetForm({ newPassword: 'short', confirmPassword: 'short' }).newPassword).toBe('Use at least 12 characters.')
    })
})
