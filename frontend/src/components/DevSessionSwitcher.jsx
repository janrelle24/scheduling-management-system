// DEVELOPMENT ONLY. Lets you pretend to be different users to see how the
// navigation changes. This is NOT authentication. It is not included in production builds.
import { useState } from 'react'
import SelectField from "./ui/SelectField";
import TextLink from "./ui/TextLink";
import { mockUsers } from '../data/mockUsers'
import { useSession } from '../hooks/useSession'
import {
    getEmailFault,
    getReadFault,
    getSubmissionFault,
    setEmailFault, 
    setReadFault,
    setSubmissionFault 
} from '../services/mockFaults'

function DevSessionSwitcher(){
    const { user, signInAs, signOut } = useSession()
    const [fault, setFault] = useState(getSubmissionFault())
    const [readFault, setReadFaultState] = useState(getReadFault())
    const [emailFault, setEmailFaultState] = useState(getEmailFault())

    function handleChange(event){
        const userId = event.target.value
        if(userId) signInAs(userId)
        else signOut()
    }

    function handleFaultChange(event) {
        setFault(event.target.value)
        setSubmissionFault(event.target.value)
    }
    function handleEmailFaultChange(event) {
        setEmailFaultState(event.target.value)
        setEmailFault(event.target.value)
    }

    function handleReadFaultChange(event) {
        setReadFaultState(event.target.value)
        setReadFault(event.target.value)
    }
    return (
        <details className="fixed bottom-20 left-3 z-40 w-72 rounded-lg border border-pending-border bg-pending-bg text-pending-fg shadow-lg lg:bottom-4">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                DEV: {user ? user.fullName : 'Signed out'}
            </summary>
            <div className="flex flex-col gap-3 border-t border-pending-border p-3 text-sm">
                <p>DEV ONLY: simulated session, not real authentication. Resets on refresh.</p>
                <SelectField label="Simulated user" value={user?.id ?? ''} onChange={handleChange}>
                <option value="">Signed out</option>
                {mockUsers
                    .filter((mockUser) => mockUser.isActive)
                    .map((mockUser) => (
                    <option key={mockUser.id} value={mockUser.id}>
                        {mockUser.fullName} ({mockUser.role})
                    </option>
                    ))}
                </SelectField>
                <SelectField label="Public form submissions" value={fault} onChange={handleFaultChange}>
                    <option value="none">Succeed normally</option>
                    <option value="server_error">Fail: server error</option>
                    <option value="rate_limited">Fail: rate limited</option>
                    <option value="network_error">Fail: network error</option>
                </SelectField>
                <SelectField label="Data loading (all pages)" value={readFault} onChange={handleReadFaultChange}>
                    <option value="none">Works normally</option>
                    <option value="server_error">Fail: server error</option>
                </SelectField>
                <SelectField label="Approval emails" value={emailFault} onChange={handleEmailFaultChange}>
                    <option value="none">Queue normally</option>
                    <option value="fail">Fail to send</option>
                </SelectField>
                <TextLink to="/dashboard">Open staff dashboard</TextLink>
                <TextLink to="/dev/style-guide">Open style guide</TextLink>
                <TextLink to="/dev/mock-data">Open mock data checks</TextLink>
            </div>
        </details>
    )
}
export default DevSessionSwitcher