//import { cx } from '../../utils/classNames'
import { buttonClass } from './buttonStyles'
/*
const base =
    'inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-colors disabled:cursor-not-allowed'

const variants = {
    primary:
        'border-brand bg-brand text-white hover:bg-brand-hover disabled:border-disabled-bg disabled:bg-disabled-bg disabled:text-disabled-fg',
    secondary:
        'border-brand bg-surface text-brand hover:bg-brand-soft disabled:border-border disabled:bg-surface disabled:text-muted',
    danger:
        'border-danger bg-danger text-white hover:bg-danger-hover disabled:border-disabled-bg disabled:bg-disabled-bg disabled:text-disabled-fg',
    dangerOutline:
        'border-danger bg-surface text-danger hover:bg-rejected-bg disabled:border-border disabled:bg-surface disabled:text-muted',
}

const sizes = {
    md: 'min-h-11 px-4 text-base',
    sm: 'min-h-9 px-3 text-sm',
}

function Button({
    variant = 'primary',
    size = 'md',
    type = 'button',
    className,
    ...props
}) {
    return (
        <button
        type={type}
        className={cx(base, variants[variant], sizes[size], className)}
        {...props}
        />
    )
}*/
function Button({
    variant = 'primary',
    size = 'md',
    type = 'button',
    className,
    ...props
}){
    return <button type={type} className={buttonClass(variant, size, className)} {...props} />
}

export default Button
