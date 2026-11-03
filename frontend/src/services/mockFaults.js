// DEVELOPMENT ONLY. Lets the yellow DEV panel make public form submissions fail,
// so the error screens can be tested. Always "none" unless changed in the DEV panel.
//   none | server_error | rate_limited | network_error
let submissionFault = 'none'

export function getSubmissionFault() {
    return submissionFault
}

export function setSubmissionFault(fault) {
    submissionFault = fault
}
