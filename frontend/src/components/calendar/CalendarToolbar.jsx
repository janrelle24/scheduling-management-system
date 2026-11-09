import { Link } from 'react-router-dom'
import ButtonLink from '../ui/ButtonLink'
import { cx } from '../../utils/classNames'
import { calendarHref, rangeLabel, shiftDate, VIEWS } from '../../utils/calendarMath'

const VIEW_LABELS = { day: 'Day', week: 'Week', month: 'Month' }

// Title, Today / ‹ › with the range, and the Day / Week / Month switch.
// Everything is a real link to /calendar?view=…&date=…, so Back, bookmarks and a new tab all work.
function CalendarToolbar({ view, date, today }) {
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <h1 className="text-2xl font-bold text-ink lg:text-3xl">Calendar</h1>
    
            <div className="flex flex-wrap items-center gap-2">
            <ButtonLink to={calendarHref(view, today)} variant="secondary">
                Today
            </ButtonLink>
            <ButtonLink to={calendarHref(view, shiftDate(view, date, -1))} variant="secondary" aria-label={`Previous ${view}`}>
                ‹
            </ButtonLink>
            <ButtonLink to={calendarHref(view, shiftDate(view, date, 1))} variant="secondary" aria-label={`Next ${view}`}>
                ›
            </ButtonLink>
            <h2 className="font-semibold text-ink" aria-live="polite">
                {rangeLabel(view, date)}
            </h2>
            </div>
    
            <nav aria-label="Calendar view" className="inline-flex overflow-hidden rounded-lg border border-brand lg:ml-auto">
            {VIEWS.map((name, index) => (
                <Link
                key={name}
                to={calendarHref(name, date)}
                aria-current={name === view ? 'page' : undefined}
                className={cx(
                    'inline-flex min-h-11 items-center px-4 text-base font-semibold',
                    index > 0 && 'border-l border-brand',
                    name === view ? 'bg-brand text-white' : 'bg-surface text-brand hover:bg-brand-soft',
                )}
                >
                {VIEW_LABELS[name]}
                </Link>
            ))}
            </nav>
        </div>
    )
}

export default CalendarToolbar