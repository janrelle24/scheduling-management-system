import { cx } from '../../utils/classNames'

export function Table({ children }) {
    return (
        <div className="relative overflow-x-auto">
            <table className="w-full border-collapse text-left text-base">{children}</table>
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