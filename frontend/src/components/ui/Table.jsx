import { cx } from '../../utils/classNames'

export function Table({ label, compact = false, children }) {
    return (
        <div className="relative overflow-x-auto">
            <table className={cx('w-full border-collapse text-left', compact ? 'text-sm' : 'text-base')}>
                {label && <caption className="sr-only">{label}</caption>}
                {children}
            </table>
        </div>
    )
}

export function Th({ className, children }) {
    return (
        <th scope="col" className={cx('px-4 py-3 text-sm font-semibold text-muted', className)}>
            {children}
        </th> 
    )
}

export function Td({ className, children }) {
    return (
        <td className={cx('border-t border-border px-4 py-3 align-middle text-ink', className)}>
            {children}
        </td>
    )   
}