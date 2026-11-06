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

// Makes EVERY service call fail with a server error (to test loading-failed screens).
//   none | server_error
let readFault = 'none'

export function getReadFault() {
    return readFault
}

export function setReadFault(fault) {
    readFault = fault
}

// Makes the approval email fail to send (to test the "email will be retried" message).
// In the real system an email failure shows up later, from the sending queue.
//   none | fail
let emailFault = 'none'

export function getEmailFault() {
    return emailFault
}

export function setEmailFault(fault){
    emailFault = fault
}