import { useEffect, useId, useRef } from 'react'

function Modal({ open, onClose, title, actions, children }){
    const dialogRef = useRef(null);
    const titleId = useId()

    useEffect(() => {
        const dialog = dialogRef.current
        if (open && !dialog.open) dialog.showModal()
        if (!open && dialog.open) dialog.close()
    }, [open])

    return (
        <dialog
            ref={dialogRef}
            onClose={onClose}
            aria-labelledby={titleId}
            className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-border bg-surface p-0 text-body shadow-xl backdrop:bg-slate-600/70"
            >
            <div className="p-6">
                <h2 id={titleId} className="text-xl font-bold text-ink">
                {title}
                </h2>
                <div className="mt-3 flex flex-col gap-4">{children}</div>
                {actions && <div className="mt-6 flex flex-wrap justify-end gap-3">{actions}</div>}
            </div>
        </dialog>
    )
}
export default Modal