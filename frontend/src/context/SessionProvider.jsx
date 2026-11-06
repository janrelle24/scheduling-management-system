import { useEffect, useMemo, useState } from 'react'
import { SessionContext } from './sessionContext'
import { mockUsers } from '../data/mockUsers'
import { setMockActor } from '../services/mockSession'
import { hasPermission } from '../utils/permissions'

// SIMULATED session for development. It is NOT authentication and provides no
// security. It lives in memory only, so a page refresh signs you out.
// Later this is replaced by GET /api/v1/auth/me.
const DEFAULT_USER_ID = 'user-marco'

function SessionProvider({ children }){
    const [userId, setUserId] = useState(DEFAULT_USER_ID)

    const value = useMemo(() => {
        const user = mockUsers.find((u) => u.id === userId && u.isActive) ?? null
        return {
            user,
            can: (permission) => hasPermission(user, permission),
            signInAs: setUserId,
            signOut: () => setUserId(null),
        }
    }, [userId]) 

    // Tells the mock services who is "signed in", like the sign-in token will for the real API.
    useEffect(() => {
        setMockActor(value.user)
    }, [value.user])

    return <SessionContext value={value}>{children}</SessionContext>
}
export default SessionProvider