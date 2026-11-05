import { useCallback, useEffect, useState } from 'react'

export function useAsyncData(load) {
    const [state, setState] = useState({ status: 'loading', data: null, error: null })
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
      let active = true // false once the page is left, so late answers are ignored
        load()
            .then((data) => {
            if (active) setState({ status: 'success', data, error: null })
            })
            .catch((error) => {
            if (active) setState({ status: 'error', data: null, error })
            })
        return () => {
            active = false
        }
    }, [load, attempt])

    const reload = useCallback(() => {
        setState({ status: 'loading', data: null, error: null })
        setAttempt((count) => count + 1)
    }, [])

    //if (state.load !== load) return { status: 'loading', data: null, error: null, reload }
    //return { status: state.status, data: state.data, error: state.error, reload }
    return { ...state, reload }
}
