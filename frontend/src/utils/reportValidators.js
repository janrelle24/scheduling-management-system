import { isValidDateString } from './calendarMath'

// The most days one report may cover. A PROPOSAL until the office approves a limit (UC-09).
export const REPORT_LIMIT_DAYS = 366

const dayNumber = (date) => {
    const [year, month, day] = date.split('-').map(Number)
    return Date.UTC(year, month - 1, day) / 86_400_000
}

// Checks the From / To of a report. Errors are keyed by field; problems with the range itself
// are reported under 'to'. Used by the screen AND by the (mock) server.
export function validateReportRange({ from, to }) {
    const errors = {}
    if (!from) errors.from = 'Choose a start date.'
    else if (!isValidDateString(from)) errors.from = 'Enter a valid date.'
    if (!to) errors.to = 'Choose an end date.'
    else if (!isValidDateString(to)) errors.to = 'Enter a valid date.'
    if (errors.from || errors.to) return errors

    if (from > to) errors.to = 'The end date must be on or after the start date.'
    else if (dayNumber(to) - dayNumber(from) + 1 > REPORT_LIMIT_DAYS) {
        errors.to = `Choose a range of at most ${REPORT_LIMIT_DAYS} days.`
    }
    return errors
}
