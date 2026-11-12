// Validation for the public request form.
// The form uses it to show errors right away, and the mock service runs it again
// (like a server would). The real backend must validate on its own too.
import { addDays, getManilaDateStr, manilaIso } from './datetime'

export const FORM_FIELDS = ['fullName', 'email', 'phone', 'purpose', 'date', 'startTime']
// Staff form, in the order the fields appear on screen (used to focus the first error).
export const STAFF_FORM_FIELDS = ['fullName', 'phone', 'email', 'purpose', 'date', 'startTime', 'endTime', 'internalNotes']

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const isValidEmail = (value) => EMAIL_PATTERN.test(value)
const PHONE_CHARACTERS = /^[+\d\s\-().]+$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export const LIMITS = { nameMin: 2, nameMax: 150, purposeMax: 500, notesMax: 1000 }

// Same rules for everyone; only the wording differs (the public speaks to the requester).
const PUBLIC_MESSAGES = {
    fullName: 'Enter your full name.',
    contact: 'Enter a valid email or provide a phone number.',
    purpose: 'Describe the purpose of your appointment.',
}
const STAFF_MESSAGES = {
    fullName: "Enter the requester's full name.",
    contact: 'Enter an email or a phone number.',
    purpose: 'Enter the purpose of the appointment.',
}

// values: { fullName, email, phone, purpose, date: 'YYYY-MM-DD', startTime: 'HH:mm' }
// now: a Date. Returns an object of messages keyed by field; empty means valid.
export function validateRequestForm(values, now, messages = PUBLIC_MESSAGES) {
    const errors = {}

    const fullName = values.fullName.trim()
    if (fullName.length < LIMITS.nameMin) errors.fullName = messages.fullName
    else if (fullName.length > LIMITS.nameMax) errors.fullName = `Name must be ${LIMITS.nameMax} characters or fewer.`

    // Contact rule (placeholder policy): at least an email or a phone number.
    const email = values.email.trim()
    const phone = values.phone.trim()
    if (email && !EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address.'
    if (phone) {
        const digits = phone.replace(/\D/g, '')
        if (!PHONE_CHARACTERS.test(phone) || digits.length < 7 || digits.length > 15) {
            errors.phone = 'Enter a valid phone number.'
        }
    }
    if (!email && !phone) errors.email = messages.contact

    const purpose = values.purpose.trim()
    if (!purpose) errors.purpose = messages.purpose
    else if (purpose.length > LIMITS.purposeMax) errors.purpose = `Purpose must be ${LIMITS.purposeMax} characters or fewer.`

    const today = getManilaDateStr(now)
    if (!values.date) errors.date = 'Choose a preferred date.'
    else if (!DATE_PATTERN.test(values.date) || addDays(values.date, 0) !== values.date) errors.date = 'Enter a valid date.'
    else if (values.date < today) errors.date = 'Choose a date that is not in the past.'

    if (!values.startTime) errors.startTime = 'Choose a preferred start time.'
    else if (!TIME_PATTERN.test(values.startTime)) errors.startTime = 'Enter a valid time.'
    else if (values.date && !errors.date && new Date(manilaIso(values.date, values.startTime)) <= now) {
        errors.startTime = 'Choose a time that has not passed.'
    }

    return errors
}

  // The staff form (New In-Person Request): the public rules, plus an end time and internal notes.
  // values: the public fields + endTime 'HH:mm' + internalNotes
export function validateStaffRequestForm(values, now) {
    const errors = validateRequestForm(values, now, STAFF_MESSAGES)

    if (!values.endTime) errors.endTime = 'Choose an end time.'
    else if (!TIME_PATTERN.test(values.endTime)) errors.endTime = 'Enter a valid time.'
    else if (values.startTime && TIME_PATTERN.test(values.startTime) && values.endTime <= values.startTime) {
        errors.endTime = 'The end time must be after the start time.'
    }

    if ((values.internalNotes ?? '').trim().length > LIMITS.notesMax) {
        errors.internalNotes = `Notes must be ${LIMITS.notesMax} characters or fewer.`
    }
    return errors
}

// ---- Sign-in and password recovery ----

// The office's password rule (Phase 3: "Use at least 12 characters"). No composition rules are
// approved. The maximum is a proposal that keeps absurd inputs out of the hashing step.
export const PASSWORD_LIMITS = { min: 12, max: 128 }

export function validateSignIn({ email, password }) {
    const errors = {}
    if (!email.trim()) errors.email = 'Enter your email.'
    else if (!isValidEmail(email.trim())) errors.email = 'Enter a valid email address.'
    if (!password) errors.password = 'Enter your password.'
    return errors
}

export function validateForgotPassword({ email }) {
    if (!email.trim()) return { email: 'Enter your work email.' }
    if (!isValidEmail(email.trim())) return { email: 'Enter a valid email address.' }
    return {}
}

// Used by the reset form AND by the server check, so the rule lives in one place.
export function validateNewPassword(password) {
    if (password.length < PASSWORD_LIMITS.min) return `Use at least ${PASSWORD_LIMITS.min} characters.`
    if (password.length > PASSWORD_LIMITS.max) return `Use ${PASSWORD_LIMITS.max} characters or fewer.`
    return undefined
}

export function validateResetForm({ newPassword, confirmPassword }) {
    const errors = {}
    const passwordError = validateNewPassword(newPassword)
    if (passwordError) errors.newPassword = passwordError
    if (!confirmPassword) errors.confirmPassword = 'Confirm your new password.'
    else if (confirmPassword !== newPassword) errors.confirmPassword = 'Passwords do not match.'
    return errors
}
