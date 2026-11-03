import { cx } from '../../utils/classNames'

export function controlClass(hasError, extra) {
    return cx(
        'min-h-11 w-full rounded-lg border bg-surface px-3 text-base text-ink placeholder:text-muted',
        'disabled:cursor-not-allowed disabled:bg-page disabled:text-muted',
        hasError ? 'border-rejected-border' : 'border-border-strong',
        extra,
    )
}