import { useState } from 'react'
import Tabs from '../../components/ui/Tabs'
import AuditPanel from '../../components/audit/AuditPanel'
import EmailNotificationsPanel from '../../components/notifications/EmailNotificationsPanel'
import PageHeader from '../../components/PageHeader'
import { useSession } from '../../hooks/useSession'
import { useUrlListState } from '../../hooks/useUrlListState'
import { AUDIT_ACTIONS } from '../../services/auditService'
import { readAuditParams } from '../../utils/listParams'
import { PERMISSIONS } from '../../utils/permissions'

const FILTER_NAMES = ['q', 'action', 'dateFrom', 'dateTo']
const ACTION_VALUES = AUDIT_ACTIONS.map((action) => action.value)
const HEADINGS = {
    audit: { title: 'Audit Log', subtitle: 'Read-only record of important actions' },
    email: { title: 'Email Notifications', subtitle: 'Delivery status and retries' },
}

// Two tabs, each with its own permission: "Audit log" (audit_logs.view) and
// "Email notifications" (email_notifications.view). The tab, filters and page live in the URL:
//   /admin/audit-log?tab=email&page=2        /admin/audit-log?q=marco&action=request.approved
function AuditLogPage() {
    const { can } = useSession()
    const { params, update, clear, setParams } = useUrlListState(FILTER_NAMES)
    const [clearCount, setClearCount] = useState(0)

    const tabs = []
    if (can(PERMISSIONS.AUDIT_LOGS_VIEW)) tabs.push({ key: 'audit', label: 'Audit log' })
    if (can(PERMISSIONS.EMAIL_NOTIFICATIONS_VIEW)) tabs.push({ key: 'email', label: 'Email notifications' })
    const activeTab = tabs.find((tab) => tab.key === params.get('tab'))?.key ?? tabs[0]?.key
    const filters = readAuditParams(params, ACTION_VALUES)

    function clearFilters() {
        clear()
        setClearCount((count) => count + 1) // remounts the panel so the search box and dates empty too
    }

    return (
        <div className="flex flex-col gap-6">
        <PageHeader title={HEADINGS[activeTab].title} subtitle={HEADINGS[activeTab].subtitle} />

        {tabs.length > 1 && (
            <Tabs
            tabs={tabs}
            value={activeTab}
            onChange={(key) => setParams({ tab: key })} // switching tabs clears the filters
            label="Record type"
            idPrefix="audit"
            />
        )}

        <div role="tabpanel" id="audit-panel" aria-labelledby={`audit-tab-${activeTab}`}>
            {activeTab === 'audit' ? (
            <AuditPanel key={`audit-${clearCount}`} filters={filters} onChange={update} onClear={clearFilters} />
            ) : (
            <EmailNotificationsPanel
                key="email"
                page={filters.page}
                onPageChange={(next) => update({ page: next }, { replace: false })}
            />
            )}
        </div>
        </div>
    )
}

export default AuditLogPage