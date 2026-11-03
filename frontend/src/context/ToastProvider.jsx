import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ToastContext } from './toastContext'
import { boxTones } from '../components/ui/tones'
import { cx } from '../utils/classNames'

const AUTO_DISMISS_MS = 6000

function ToastItem({ toast, onDismiss }) {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS)
        return () => clearTimeout(timer)
    }, [toast.id, onDismiss])

return (
    <div
        className={cx(
            'flex items-start gap-3 rounded-lg border px-4 py-3 text-base shadow-lg',
            boxTones[toast.tone],
        )}
        >
        <p className="flex-1">
            {toast.title && <strong className="font-semibold">{toast.title} </strong>}
            {toast.message}
        </p>
        <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="-m-1 rounded p-1 text-xl leading-none"
        >
            ×
        </button>
        </div>
    )
}

export default function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const nextId = useRef(0)

    const dismiss = useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
    }, [])

    const show = useCallback(({ tone = 'success', title, message }) => {
        nextId.current += 1
        const id = nextId.current
        setToasts((current) => [...current, { id, tone, title, message }])
    }, [])

    const value = useMemo(() => ({ show, dismiss }), [show, dismiss])

return (
    <ToastContext value={value}>
        {children}
        <div
            aria-live="polite"
            className="fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100%-2rem))] flex-col gap-2"
        >
            {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
        </div>
    </ToastContext>
    )
}
