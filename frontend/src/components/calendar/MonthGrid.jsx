import { Link } from 'react-router-dom'
import CalendarEvent from './CalendarEvent'
import { cx } from '../../utils/classNames'
import { calendarHref, getDayStatus, getMonthGrid, groupEventsByDate } from '../../utils/calendarMath'
import { formatDayHeading, manilaIso } from '../../utils/datetime'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const CHIPS_SHOWN = 2

// The Month view. From tablet width up each day shows up to two events and "+N more".
// On phones a day shows only a count, and tapping the date opens that day.
// Days of the neighbouring months are left blank; closed days and holidays are hatched.
function MonthGrid({ date, events, workingHours, unavailable, today }) {
    const weeks = getMonthGrid(date)
    const byDate = groupEventsByDate(events)

    return (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((day) => (
                <div key={day} className="py-3 text-center text-sm font-semibold text-ink">
                {day}
                </div>
            ))}
            </div>
            {weeks.map((week) => (
            <div key={week[0].date} className="grid grid-cols-7">
                {week.map((cell) => {
                if (!cell.inMonth) {
                    return <div key={cell.date} aria-hidden="true" className="min-h-14 border-r border-b border-border bg-page md:min-h-28" />
                }
                const dayEvents = byDate[cell.date] ?? []
                const { closed, label } = getDayStatus(cell.date, workingHours, unavailable)
                const isToday = cell.date === today
                const extra = dayEvents.length - CHIPS_SHOWN
                const heading = formatDayHeading(manilaIso(cell.date, '12:00'))
    
                return (
                    <div
                    key={cell.date}
                    className={cx('min-h-14 border-r border-b border-border p-1.5 md:min-h-28', closed && 'hatched')}
                    >
                    <Link
                        to={calendarHref('day', cell.date)}
                        aria-label={`Open ${heading}${dayEvents.length ? `, ${dayEvents.length} ${dayEvents.length === 1 ? 'item' : 'items'}` : ''}`}
                        aria-current={isToday ? 'date' : undefined}
                        className={cx(
                        'inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-semibold',
                        isToday ? 'bg-brand text-white' : 'text-ink hover:bg-brand-soft',
                        )}
                    >
                        {Number(cell.date.slice(8))}
                    </Link>
                    {label && <p className="mt-0.5 truncate text-xs text-muted">{label}</p>}
                    {closed && !label && <p className="sr-only">Office closed.</p>}
    
                    <ul className="mt-1 hidden flex-col gap-1 md:flex">
                        {dayEvents.slice(0, CHIPS_SHOWN).map((event) => (
                        <li key={event.id}>
                            <CalendarEvent event={event} layout="chip" />
                        </li>
                        ))}
                        {extra > 0 && (
                        <li>
                            <Link
                            to={calendarHref('day', cell.date)}
                            className="text-xs font-semibold text-brand underline underline-offset-2"
                            >
                            +{extra} more
                            </Link>
                        </li>
                        )}
                    </ul>
                    {dayEvents.length > 0 && (
                        <p className="mt-1 text-xs font-semibold text-brand md:hidden">
                        {dayEvents.length}
                        <span className="sr-only"> {dayEvents.length === 1 ? 'item' : 'items'}</span>
                        </p>
                    )}
                    </div>
                )
                })}
            </div>
            ))}
        </div>
    )
}
export default MonthGrid