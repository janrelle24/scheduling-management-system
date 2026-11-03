import { useContext } from 'react'
import { SessionContext } from '../context/sessionContext'

// const { user, can, signOut } = useSession()
// can(PERMISSIONS.APPOINTMENTS_APPROVE) -> true / false
export function useSession() {
    const context = useContext(SessionContext)
    if (!context) throw new Error('useSession must be used inside <SessionProvider>')
    return context
}
