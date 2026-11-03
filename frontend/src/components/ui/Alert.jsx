import { cx } from '../../utils/classNames'
import { boxTones } from './tones'

function Alert({ tone = 'warning', title, className, children }) {
    return (
        <div
        role={tone === 'error' ? 'alert' : 'status'}
        className={cx('rounded-lg border px-4 py-3 text-base', boxTones[tone], className)}
        >
        {title && <strong className="font-semibold">{title} </strong>}
        {children}
        </div>
    )
}

export default Alert
