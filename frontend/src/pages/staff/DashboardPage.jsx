import Card from '../../components/ui/Card'
import ButtonLink from '../../components/ui/ButtonLink'
import PageHeader from '../../components/PageHeader'
import PendingRequestsCard from '../../components/dashboard/PendingRequestsCard'
import StatusSummary from '../../components/dashboard/StatusSummary'
import TodaysAppointmentsCard from '../../components/dashboard/TodaysAppointmentsCard'
import { useSession } from '../../hooks/useSession'
import { getNow } from '../../utils/clock'
import { formatLongDate, TIMEZONE } from '../../utils/datetime'
import { PERMISSIONS } from '../../utils/permissions'

function DasboardPage(){
    const { can } = useSession()
    const canViewRequests = can(PERMISSIONS.REQUESTS_VIEW)
    const canViewAppointments = can(PERMISSIONS.APPOINTMENTS_VIEW)
    const canCreate = can(PERMISSIONS.REQUESTS_CREATE)

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Dashboard"
                subtitle={`${formatLongDate(getNow())} · ${TIMEZONE}`}
                action={canCreate && <ButtonLink to="/requests/new">+ New In-Person Request</ButtonLink>}
            />
        
            {!canViewRequests && !canViewAppointments ? (
                <Card className="max-w-xl">
                <p>
                    Your account doesn't have access to requests or the schedule. Use the Administration
                    pages in the menu, or ask an administrator for access.
                </p>
                </Card>
            ) : (
                <>
                {canViewRequests && <StatusSummary />}
                <div
                    className={`grid items-start gap-6 ${
                    canViewRequests && canViewAppointments ? 'min-[1360px]:grid-cols-[3fr_2fr]' : ''
                    }`}
                >
                    {canViewRequests && <PendingRequestsCard />}
                    {canViewAppointments && <TodaysAppointmentsCard />}
                </div>
                </>
            )}
        </div>
    )
}
export default DasboardPage