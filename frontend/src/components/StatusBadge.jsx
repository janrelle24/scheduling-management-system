import Badge from './ui/Badge'

const DISPLAY = {
    pending: { label: 'Pending', tone: 'pending' },
    confirmed: { label: 'Confirmed', tone: 'confirmed' },
    rejected: { label: 'Rejected', tone: 'rejected' },
    cancelled: { label: 'Cancelled', tone: 'cancelled' },
    completed: { label: 'Completed', tone: 'completed' },
    queued: { label: 'Queued', tone: 'pending' },
    sent: { label: 'Sent', tone: 'confirmed' },
    failed: { label: 'Failed', tone: 'rejected' },
    success: { label: 'Success', tone: 'confirmed' },
}

function StatusBadge({ status }){
    const display = DISPLAY[status] ?? { label: status, tone: 'neutral' }
    return <Badge tone={display.tone}>{display.label}</Badge>
}
export default StatusBadge