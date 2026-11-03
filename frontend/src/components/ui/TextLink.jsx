import { Link } from 'react-router-dom'
import { cx } from '../../utils/classNames'

// Underlined navy link, e.g. "View all" or "← Back to requests".
function TextLink({ className, ...props }) {
    return (
        <Link
        className={cx(
            'font-medium text-brand underline underline-offset-2 hover:text-brand-hover',
            className,
        )}
        {...props}
        />
    )
}

export default TextLink
