import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SessionContext } from './sessionContext'
import { db } from '../data/store'
//import { mockUsers } from '../data/mockUsers'
import { login, logout } from '../services/authService'
import { onUnauthorized, setMockActor } from '../services/mockSession'
import { hasPermission } from '../utils/permissions'

// SIMULATED session for development. It is NOT authentication and provides no
// security. It lives in memory only, so a page refresh signs you out.
// Later this is replaced by GET /api/v1/auth/me (the browser keeps the real session in a
// secure cookie, so a refresh will NOT sign you out then).
function SessionProvider({ children }){
    const navigate = useNavigate()
    const [userId, setUserId] = useState(null)
    const [version, setVersion] = useState(0) // bumped to re-read the account after it was edited
    // The same value as userId, readable at once. Lets a late 401 know the person already signed out.
    const userIdRef = useRef(null)

    const setSession = useCallback((id) => {
        userIdRef.current = id
        setUserId(id)
    }, [])

    // POST /auth/login. Throws the service's error (401 invalid_credentials, 422) for the screen to show.
    const signIn = useCallback(
        async (email, password) => {
            const { user } = await login({ email, password })
            setSession(user.id)
        },
        [setSession],
    )

    // Ends the session and shows the "signed out" screen. startTransition keeps "signed out"
  // and "go to /signed-out" in one render, so the staff layout does not bounce you to /sign-in first.
    const signOut = useCallback(() => {
        userIdRef.current = null
        logout().catch(() => {}) // the real API call; nothing to wait for
        startTransition(() => {
        setUserId(null)
        navigate('/signed-out')
        })
    }, [navigate])

    // Any 401 on a protected call means the session ended on the server (timeout).
    useEffect(
        () =>
        onUnauthorized(() => {
            if (!userIdRef.current) return // the person already signed out on purpose
            userIdRef.current = null
            startTransition(() => {
            setUserId(null)
            navigate('/signed-out?reason=timeout')
            })
        }),
        [navigate],
    )

    const refreshSession = useCallback(() => setVersion((count) => count + 1), [])

    const value = useMemo(() => {
        // `version` is read so this re-runs after an edit: the account lives in the (mock) stored accounts.
        const user = version >= 0 ? (db.users.find((u) => u.id === userId && u.isActive) ?? null) : null
        return {
            user,
            can: (permission) => hasPermission(user, permission),
            signIn,
            signInAs: setSession, // DEV panel only: jump straight to a user, no password
            signOut,
            refreshSession, // after an administrator edits their OWN account (the real app re-reads GET /auth/me)
        }
    }, [userId, version, signIn, signOut, setSession, refreshSession]) 

    // Tells the mock services who is "signed in", like the sign-in token will for the real API.
    useEffect(() => {
        setMockActor(value.user)
    }, [value.user])

    return <SessionContext value={value}>{children}</SessionContext>
}
export default SessionProvider