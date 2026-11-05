import Badge from '../../ui/Badge'
import Card from '../../ui/Card'
import { Table, Td, Th } from '../../ui/Table'
import StatusBadge from '../../StatusBadge'
import { NOTIFICATION_LABELS } from '../../../utils/requestTimeline'

// Email type and delivery status only. Recipient address, attempts and error text are for
// the Email Notifications page (needs its own permission).
function NotificationsCard({ request }){
    const rows = request.notifications.map((notification) => ({
        id: notification.id,
        label: NOTIFICATION_LABELS[notification.templateKey] ?? notification.templateKey,
        status: notification.status,
    }))
    // A pending request with an email address will get a decision email later.
    if (request.displayStatus === 'pending' && request.requesterEmail) {
        rows.push({ id: 'decision-pending', label: 'Decision', status: null })
    }

    return (
        <Card title="Notifications">
            {rows.length === 0 ? (
                <p className="text-muted">No email on file, so no notifications are sent.</p>
            ) : (
                <Table label="Email notifications">
                <thead>
                    <tr>
                    <Th>Email</Th>
                    <Th>Status</Th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                    <tr key={row.id}>
                        <Td>{row.label}</Td>
                        <Td>{row.status ? <StatusBadge status={row.status} /> : <Badge>Not sent yet</Badge>}</Td>
                    </tr>
                    ))}
                </tbody>
                </Table>
            )}
            <p className="mt-3 text-sm text-muted">A failed email never changes the appointment status.</p>
        </Card>
    )

}
export default NotificationsCard