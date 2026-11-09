import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import ErrorState from '../../components/ui/ErrorState'
import Spinner from '../../components/ui/Spinner'
import AgendaList from '../../components/calendar/AgendaList'
import CalendarToolbar from '../../components/calendar/CalendarToolbar'
import DaySummaryCard from '../../components/calendar/DaySummaryCard'
import MonthGrid from '../../components/calendar/MonthGrid'
import TimeGrid from '../../components/calendar/TimeGrid'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useSession } from '../../hooks/useSession'
import { getCalendar } from '../../services/appointmentService'
import { DEFAULT_VIEW, getDaysInRange, getRange, isValidDateString, VIEWS } from '../../utils/calendarMath'
import { getNow } from '../../utils/clock'
import { getManilaDateStr } from '../../utils/datetime'
import { PERMISSIONS } from '../../utils/permissions'

// What the colours and hatching mean (UC-08: pending must never look like a booking).
function Legend() {
    return (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span className="rounded-md bg-confirmed-bg px-2 py-0.5 font-semibold text-confirmed-fg">Confirmed</span>
            blocks the time ·
            <span className="rounded-md border-2 border-dashed border-pending-border px-2 py-0.5 font-semibold text-pending-fg">
            Pending
            </span>
            is a request only, not a booking · Hatched = non-working
        </p>
    )
}

// Loads one range and draws the chosen view. It is rendered with key={user id} (below), so
// signing in as someone else starts again: what a calendar shows depends on who is looking.
function CalendarView({ view, date, today }) {
    const { can } = useSession()
    const { from, to } = getRange(view, date)
    const load = useCallback(() => getCalendar({ from, to }), [from, to])
    const { status, data, reload } = useAsyncData(load)

    return (
        <div className="flex flex-col gap-4">
            <CalendarToolbar view={view} date={date} today={today} />
            <Legend />
    
            {status === 'loading' && <Spinner label="Loading calendar…" />}
            {status === 'error' && <ErrorState message="We couldn't load the calendar." onRetry={reload} />}
    
            {status === 'success' && view === 'day' && (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <TimeGrid
                days={[date]}
                events={data.events}
                workingHours={data.workingHours}
                unavailable={data.unavailable}
                today={today}
                />
                <DaySummaryCard events={data.events} canCreate={can(PERMISSIONS.REQUESTS_CREATE)} />
            </div>
            )}
    
            {status === 'success' && view === 'week' && (
            <>
                <div className="hidden md:block">
                <TimeGrid
                    days={getDaysInRange(from, to)}
                    events={data.events}
                    workingHours={data.workingHours}
                    unavailable={data.unavailable}
                    today={today}
                />
                </div>
                <div className="md:hidden">
                <AgendaList
                    days={getDaysInRange(from, to)}
                    events={data.events}
                    workingHours={data.workingHours}
                    unavailable={data.unavailable}
                />
                </div>
            </>
            )}
    
            {status === 'success' && view === 'month' && (
            <MonthGrid
                date={date}
                events={data.events}
                workingHours={data.workingHours}
                unavailable={data.unavailable}
                today={today}
            />
            )}
        </div>
    )
}

// The view and date live in the URL (/calendar?view=week&date=2026-10-26), so Back, bookmarks
// and the Today / ‹ › links work. Anything invalid falls back to this week.
function CalendarPage() {
    const { user } = useSession()
    const [params] = useSearchParams()
    const today = getManilaDateStr(getNow())
    const view = VIEWS.includes(params.get('view')) ? params.get('view') : DEFAULT_VIEW
    const date = isValidDateString(params.get('date')) ? params.get('date') : today

    return <CalendarView key={user?.id ?? 'none'} view={view} date={date} today={today} />
}

export default CalendarPage