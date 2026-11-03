// Validation for the public request form.
// The form uses it to show errors right away, and the mock service runs it again
// (like a server would). The real backend must validate on its own too.
import { addDays, getManilaDateStr, manilaIso } from './datetime'

export const FORM_FIELDS = ['fullName', 'email', 'phone', 'purpose', 'date', 'startTime']

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_CHARACTERS = /^[+\d\s\-().]+$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export const LIMITS = { nameMin: 2, nameMax: 150, purposeMax: 500 }

// values: { fullName, email, phone, purpose, date: 'YYYY-MM-DD', startTime: 'HH:mm' }
// now: a Date. Returns an object of messages keyed by field; empty means valid.
export function validateRequestForm(values, now) {
    const errors = {}

    const fullName = values.fullName.trim()
    if (fullName.length < LIMITS.nameMin) errors.fullName = 'Enter your full name.'
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
    if (!email && !phone) errors.email = 'Enter a valid email or provide a phone number.'

    const purpose = values.purpose.trim()
    if (!purpose) errors.purpose = 'Describe the purpose of your appointment.'
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
