import CalendarEvent from './CalendarEvent'
import {
  formatHourLabel,
  getHourRange,
  getUnavailableBlocks,
  groupEventsByDate,
  HOUR_HEIGHT,
  layoutOverlaps,
  positionEvent,
} from '../../utils/calendarMath'
import { formatDayColumn, formatDayHeading, manilaIso } from '../../utils/datetime'

const noon = (date) => manilaIso(date, '12:00')
const px = (minutes, startHour) => ((minutes - startHour * 60) / 60) * HOUR_HEIGHT

// One day: hour lines, hatched non-working time, and its events.
// Each day is a labelled list of links in time order, so screen readers read it as a list,
// not as a drawing.
function DayColumn({ date, events, workingHours, unavailable, startHour, endHour }) {
    const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index)
    const blocks = getUnavailableBlocks(date, workingHours, unavailable, startHour, endHour)
    const closed = blocks.length === 1 && blocks[0].start === startHour * 60 && blocks[0].end === endHour * 60
    const notes = blocks.filter((block) => block.label).map((block) => block.label)

    return (
        <section
        aria-label={formatDayHeading(noon(date))}
        className="relative border-l border-border"
        style={{ height: (endHour - startHour) * HOUR_HEIGHT }}
        >
        {hours.map((hour) => (
            <div
            key={hour}
            aria-hidden="true"
            className="absolute inset-x-0 border-t border-border"
            style={{ top: (hour - startHour) * HOUR_HEIGHT }}
            />
        ))}
        {blocks.map((block) => (
            <div
            key={`${block.start}-${block.end}`}
            aria-hidden="true"
            className="hatched absolute inset-x-0"
            style={{ top: px(block.start, startHour), height: px(block.end, startHour) - px(block.start, startHour) }}
            >
            {block.label && <span className="block px-1 pt-1 text-xs font-medium text-muted">{block.label}</span>}
            </div>
        ))}
        <p className="sr-only">
            {closed ? 'Office closed.' : ''} {notes.length > 0 ? `Unavailable: ${notes.join(', ')}.` : ''}
            {events.length === 0 ? ' Nothing scheduled.' : ''}
        </p>
        <ul>
            {layoutOverlaps(events).map(({ event, column, columns }) => {
            const { top, height } = positionEvent(event, startHour)
            return (
                <li
                key={event.id}
                className="absolute"
                style={{
                    top,
                    height,
                    left: `calc(${(column / columns) * 100}% + 2px)`,
                    width: `calc(${100 / columns}% - 4px)`,
                }}
                >
                <CalendarEvent event={event} layout="block" />
                </li>
            )
            })}
        </ul>
        </section>
    )
}

// The hour grid for the Day view (one column) and the Week view (seven).
// Hours run from the office's opening to closing and widen if an event falls outside them.
function TimeGrid({ days, events, workingHours, unavailable, today }) {
    const { startHour, endHour } = getHourRange(workingHours, events)
    const byDate = groupEventsByDate(events)
    const columns = { gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` }

    return (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <div style={{ minWidth: days.length > 1 ? '40rem' : undefined }}>
            <div className="grid border-b border-border" style={columns}>
            <div />
            {days.map((date) => (
                <div
                key={date}
                aria-current={date === today ? 'date' : undefined}
                className={`border-l border-border px-2 py-3 text-center font-semibold ${date === today ? 'text-brand' : 'text-ink'}`}
                >
                {formatDayColumn(noon(date))}
                </div>
            ))}
            </div>
            <div className="grid" style={columns}>
            <div className="relative" aria-hidden="true" style={{ height: (endHour - startHour) * HOUR_HEIGHT }}>
                {Array.from({ length: endHour - startHour }, (_, index) => startHour + index).map((hour, index) => (
                <span
                    key={hour}
                    className="absolute right-2 text-xs text-muted"
                    style={{ top: index * HOUR_HEIGHT + 2 }}
                >
                    {formatHourLabel(hour, index === 0)}
                </span>
                ))}
            </div>
            {days.map((date) => (
                <DayColumn
                key={date}
                date={date}
                events={byDate[date] ?? []}
                workingHours={workingHours}
                unavailable={unavailable}
                startHour={startHour}
                endHour={endHour}
                />
            ))}
            </div>
        </div>
        </div>
    )
}

export default TimeGrid