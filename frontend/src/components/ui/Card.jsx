import { cx } from '../../utils/classNames'

function Card({ title, action, flush = false, className, children }){
    const hasHeader = Boolean(title || action)
    return (
        <section
            className={cx(
                'rounded-lg border border-border bg-surface',
                flush && 'overflow-hidden',
                className,
            )}
        >
            {hasHeader && (
                <header
                className={cx(
                    'flex items-center justify-between gap-4 px-5 py-4',
                    flush && 'border-b border-border',
                )}
                >
                {title && <h2 className="text-lg font-semibold text-ink">{title}</h2>}
                {action}
                </header>
            )}
            <div className={cx(!flush && 'px-5 pb-5', !flush && !hasHeader && 'pt-5')}>
                {children}
            </div>
            </section>
    )
}
export default Card