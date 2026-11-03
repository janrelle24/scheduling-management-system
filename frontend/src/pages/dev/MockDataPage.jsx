// DEVELOPMENT ONLY: shows the sample data rules and what the services return.
// Only registered as a route when running `npm run dev`.
import { useEffect, useMemo, useState } from 'react'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import { Table, Td, Th } from '../../components/ui/Table'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { MOCK_NOW_ISO, getNow } from '../../utils/clock'
import {
    formatAge,
    formatDateTime,
    formatLongDate,
    formatTimeRange,
    getManilaDateStr,
    TIMEZONE,
} from '../../utils/datetime'
import { getCalendar, listAppointments } from '../../services/appointmentService'
import { listAuditLogs } from '../../services/auditService'
import { listEmailNotifications } from '../../services/notificationService'
import { getAppointmentReport } from '../../services/reportService'
import { getRequest, listRequests } from '../../services/requestService'
import { getSchedulingSettings } from '../../services/settingsService'
import { listUsers } from '../../services/userService'
import { runMockDataChecks } from './mockDataChecks'

async function loadDemo() {
    const today = getManilaDateStr(MOCK_NOW_ISO)
    const [report, pending, search, todays, calendar, audit, emails, settings, users, maria] =
        await Promise.all([
        getAppointmentReport(),
        listRequests({ status: 'pending', pageSize: 4 }),
        listRequests({ search: 'maria' }),
        listAppointments({ from: today, to: today, status: 'confirmed' }),
        getCalendar({ from: '2026-10-26', to: '2026-11-01' }),
        listAuditLogs({ pageSize: 5 }),
        listEmailNotifications({ pageSize: 5 }),
        getSchedulingSettings(),
        listUsers(),
        getRequest('req-0142'),
        ])
    let notFound = 'no error thrown'
    try {
        await getRequest('does-not-exist')
    } catch (error) {
        notFound = `${error.status} ${error.code}: ${error.message}`
    }
    return { report, pending, search, todays, calendar, audit, emails, settings, users, maria, notFound }
}

function MockDataPage() {
    const checks = useMemo(() => runMockDataChecks(), [])
    const [demo, setDemo] = useState(null)

    useEffect(() => {
        let active = true
        loadDemo().then((result) => {
        if (active) setDemo(result)
        })
        return () => {
        active = false
        }
    }, [])

    const now = getNow()
    const failed = checks.filter((c) => !c.pass).length

    return (
        <div className="mx-auto max-w-5xl space-y-8 p-6 lg:p-10">
        <PageHeader title="Mock data" subtitle="Development only. Checks the simulated data and services. If you submitted requests in this session, reload the page to reset the data." />

        <Card title={`Data rules: ${failed === 0 ? 'all pass' : `${failed} FAILED`}`}>
            <ul className="space-y-2" data-testid="checks">
            {checks.map((c) => (
                <li key={c.name} className="flex items-start gap-3">
                <Badge tone={c.pass ? 'confirmed' : 'rejected'}>{c.pass ? 'PASS' : 'FAIL'}</Badge>
                <span>
                    {c.name}
                    {c.detail && <span className="text-rejected-fg"> ({c.detail})</span>}
                </span>
                </li>
            ))}
            </ul>
        </Card>

        <Card title="Time (Asia/Manila)">
            <dl className="space-y-1" data-testid="time">
            <div>Browser timezone: <b>{Intl.DateTimeFormat().resolvedOptions().timeZone}</b></div>
            <div>App timezone: <b>{TIMEZONE}</b></div>
            <div>Now: <b>{formatLongDate(MOCK_NOW_ISO)}</b>, {formatDateTime(MOCK_NOW_ISO)}</div>
            <div>Sample range: <b>{formatTimeRange('2026-10-26T11:00:00+08:00', '2026-10-26T12:00:00+08:00')}</b> and <b>{formatTimeRange('2026-10-26T09:00:00+08:00', '2026-10-26T10:00:00+08:00')}</b></div>
            </dl>
        </Card>

        {!demo ? (
            <Spinner label="Calling services…" />
        ) : (
            <>
            <Card title="reportService.getAppointmentReport()">
                <div className="flex flex-wrap gap-2" data-testid="counts">
                {Object.entries(demo.report.statusCounts).map(([status, count]) => (
                    <span key={status} className="flex items-center gap-1">
                    <StatusBadge status={status} /> <b>{count}</b>
                    </span>
                ))}
                <span>Total: <b>{demo.report.total}</b></span>
                </div>
            </Card>

            <Card flush title="requestService.listRequests({ status: 'pending', pageSize: 4 })">
                <Table>
                <thead>
                    <tr><Th>Ref</Th><Th>Requester</Th><Th>Preferred time</Th><Th>Source</Th><Th>Age</Th></tr>
                </thead>
                <tbody data-testid="pending">
                    {demo.pending.items.map((r) => (
                    <tr key={r.id}>
                        <Td className="font-mono text-sm">{r.referenceNumber}</Td>
                        <Td>{r.requesterName}</Td>
                        <Td>{formatDateTime(r.preferredStartAt)}</Td>
                        <Td><Badge>{r.source === 'online' ? 'Online' : 'In-person'}</Badge></Td>
                        <Td>{formatAge(r.createdAt, now)}</Td>
                    </tr>
                    ))}
                </tbody>
                </Table>
                <p className="px-4 py-3 text-sm text-muted">Total pending: {demo.pending.total}</p>
            </Card>

            <Card title="Other services">
                <ul className="space-y-2" data-testid="services">
                <li>Search "maria": {demo.search.total} result(s) ({demo.search.items.map((r) => r.referenceNumber).join(', ')})</li>
                <li>Today's confirmed appointments: {demo.todays.map((a) => `${formatTimeRange(a.startAt, a.endAt)} ${a.purpose}`).join(' | ')}</li>
                <li>Calendar Oct 26 – Nov 1: {demo.calendar.events.length} events ({demo.calendar.events.filter((e) => e.kind === 'request').length} pending request(s), not blocking), {demo.calendar.unavailable.length} unavailable period(s)</li>
                <li>Request REQ-0142: {demo.maria.statusHistory.length} history row(s), {demo.maria.notifications.length} email(s), {demo.maria.activity.length} activity row(s)</li>
                <li>Audit log (latest 5): {demo.audit.items.map((a) => `${a.actorName}: ${a.actionLabel} [${a.recordLabel}] ${a.result}`).join(' | ')}</li>
                <li>Emails (latest 5): {demo.emails.items.map((e) => `${e.templateKey}/${e.status}`).join(', ')}</li>
                <li>Settings: {demo.settings.defaultDurationMinutes} min, buffer {demo.settings.bufferMinutes}, retention {demo.settings.retentionMonths} months ({demo.settings.policyStatus})</li>
                <li>Users: {demo.users.map((u) => u.fullName).join(', ')}</li>
                <li>Unknown request id → <span data-testid="notfound">{demo.notFound}</span></li>
                </ul>
            </Card>
            </>
        )}
        </div>
    )
}

export default MockDataPage