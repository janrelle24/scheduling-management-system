import { cx } from '../../utils/classNames'

const tones = {
    pending: 'bg-pending-bg text-pending-fg',
    confirmed: 'bg-confirmed-bg text-confirmed-fg',
    rejected: 'bg-rejected-bg text-rejected-fg',
    cancelled: 'bg-cancelled-bg text-cancelled-fg',
    completed: 'bg-completed-bg text-completed-fg',
    neutral: 'bg-cancelled-bg text-cancelled-fg',
}

function Badge({ tone = 'neutral', className, children }) {
    return (
        <span
        className={cx(
            'inline-flex items-center rounded-md px-2 py-0.5 text-sm font-semibold leading-5',
            tones[tone],
            className,
        )}
        >
        {children}
        </span>
    )
}

export default Badge
