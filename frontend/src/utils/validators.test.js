import { describe, expect, it } from 'vitest'
import { validateRequestForm, validateStaffRequestForm } from './validators'
import { addMinutesToTime } from './datetime'

const now = new Date('2026-10-26T10:15:00+08:00')
const valid = { fullName: 'Ana Lopez', email: 'ana@example.com', phone: '', purpose: 'Visit', date: '2026-11-03', startTime: '10:00', endTime: '11:00', internalNotes: '' }

describe('validateRequestForm (public)', () => {
    it('keeps the public wording', () => {
        const errors = validateRequestForm({ ...valid, fullName: '', email: '', purpose: '' }, now)
        expect(errors.fullName).toBe('Enter your full name.')
        expect(errors.email).toBe('Enter a valid email or provide a phone number.')
        expect(errors.purpose).toBe('Describe the purpose of your appointment.')
    })
})

describe('validateStaffRequestForm', () => {
    it('accepts a valid form', () => {
        expect(validateStaffRequestForm(valid, now)).toEqual({})
    })

    it('uses staff wording and the same rules', () => {
        const errors = validateStaffRequestForm({ ...valid, fullName: '', email: '', purpose: '' }, now)
        expect(errors.fullName).toBe("Enter the requester's full name.")
        expect(errors.email).toBe('Enter an email or a phone number.')
        expect(errors.purpose).toBe('Enter the purpose of the appointment.')
    })

    it('accepts a phone number without an email', () => {
        expect(validateStaffRequestForm({ ...valid, email: '', phone: '0917 111 2222' }, now)).toEqual({})
    })

    it('checks the end time against the start time', () => {
        expect(validateStaffRequestForm({ ...valid, endTime: '10:00' }, now).endTime).toBe('The end time must be after the start time.')
        expect(validateStaffRequestForm({ ...valid, endTime: '' }, now).endTime).toBe('Choose an end time.')
    })
})

describe('addMinutesToTime', () => {
    it('adds minutes and refuses to pass midnight', () => {
        expect(addMinutesToTime('09:30', 60)).toBe('10:30')
        expect(addMinutesToTime('23:30', 60)).toBe('')
        expect(addMinutesToTime('', 60)).toBe('')
        expect(addMinutesToTime('9:3', 60)).toBe('')
    })
})