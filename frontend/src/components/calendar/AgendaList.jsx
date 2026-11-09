import CalendarEvent from './CalendarEvent'
import { getDayStatus, groupEventsByDate } from '../../utils/calendarMath'
import { formatDayHeading, manilaIso } from '../../utils/datetime'

// The Week view on phones, where seven columns will not fit: a list of days with their events.
function AgendaList({ days, events, workingHours, unavailable }) {
    const byDate = groupEventsByDate(events)

    return (
        <div className="flex flex-col gap-4">
            {days.map((date) => {
            const dayEvents = byDate[date] ?? []
            const { closed, label } = getDayStatus(date, workingHours, unavailable)
            return (
                <section key={date} aria-labelledby={`agenda-${date}`}>
                <h3 id={`agenda-${date}`} className="mb-2 font-semibold text-ink">
                    {formatDayHeading(manilaIso(date, '12:00'))}
                </h3>
                {dayEvents.length === 0 ? (
                    <p className={`rounded-lg px-3 py-2 text-sm text-muted ${closed ? 'hatched' : 'bg-surface'}`}>
                    {closed ? (label ? `Unavailable: ${label}` : 'Office closed') : 'Nothing scheduled'}
                    </p>
                ) : (
                    <ul className="flex flex-col gap-2">
                    {dayEvents.map((event) => (
                        <li key={event.id}>
                        <CalendarEvent event={event} layout="agenda" />
                        </li>
                    ))}
                    </ul>
                )}
                </section>
            )
            })}
        </div>
    )
}

export default AgendaList