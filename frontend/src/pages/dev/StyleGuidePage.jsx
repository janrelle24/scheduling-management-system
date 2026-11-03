import { useState } from 'react'
import Alert from '../../components/ui/Alert'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Checkbox from '../../components/ui/Checkbox'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import SelectField from '../../components/ui/SelectField'
import Spinner from '../../components/ui/Spinner'
import { Table, Td, Th } from '../../components/ui/Table'
import TextField from '../../components/ui/TextField'
import TextLink from '../../components/ui/TextLink'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { useToast } from '../../hooks/useToast'

const SWATCHES = [
    ['brand', 'Brand'],
    ['brand-soft', 'Brand soft'],
    ['page', 'Page'],
    ['border', 'Border'],
    ['ink', 'Ink'],
    ['body', 'Body'],
    ['muted', 'Muted'],
    ['danger', 'Danger'],
    ['pending-bg', 'Pending'],
    ['confirmed-bg', 'Confirmed'],
    ['rejected-bg', 'Rejected'],
    ['cancelled-bg', 'Cancelled'],
    ['completed-bg', 'Completed'],
]

function Section({ title, children }) {
    return (
        <section className="space-y-4">
            <h2 className="border-b border-border pb-2 text-xl font-bold text-ink">{title}</h2>
            {children}
        </section>
    )
}
function StyleGuidePage(){
    const [modalOpen, setModalOpen] = useState(false)
    const toast = useToast()

    return (
        <div className="mx-auto max-w-5xl space-y-10 p-6 lg:p-10">
        <PageHeader
            title="Style guide"
            subtitle="Development only. Shows the shared design foundation."
            action={<Button onClick={() => setModalOpen(true)}>Open example dialog</Button>}
        />

        <Section title="Colors">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {SWATCHES.map(([token, name]) => (
                <div key={token} className="text-sm">
                <div
                    className="h-12 rounded-lg border border-border"
                    style={{ backgroundColor: `var(--color-${token})` }}
                />
                <p className="mt-1 font-semibold text-ink">{name}</p>
                <p className="font-mono text-xs text-muted">{token}</p>
                </div>
            ))}
            </div>
        </Section>

        <Section title="Typography">
            <h1 className="text-3xl font-bold text-ink">Page title (3xl bold)</h1>
            <h2 className="text-lg font-semibold text-ink">Card heading (lg semibold)</h2>
            <p>Body text (base). Appointments are shown in the Asia/Manila timezone.</p>
            <p className="text-sm text-muted">Secondary text (sm, muted).</p>
            <p className="font-mono text-sm text-ink">REQ-2026-0142 (mono, reference numbers)</p>
            <TextLink to="/">Text link</TextLink>
        </Section>

        <Section title="Buttons">
            <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="dangerOutline">Danger outline</Button>
            <Button size="sm" variant="secondary">
                Small
            </Button>
            </div>
            <div className="flex flex-wrap gap-3">
            <Button disabled>Primary disabled</Button>
            <Button variant="secondary" disabled>
                Secondary disabled
            </Button>
            <Button variant="danger" disabled>
                Danger disabled
            </Button>
            </div>
        </Section>

        <Section title="Form controls">
            <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full name" required placeholder="e.g. Maria Santos" />
            <TextField
                label="Email"
                type="email"
                error="Enter a valid email or provide a phone number."
            />
            <TextField
                label="Phone"
                hint="Provide at least an email or a phone number."
            />
            <SelectField label="Report type" defaultValue="status">
                <option value="status">Status summary</option>
                <option value="confirmed">Confirmed appointments</option>
            </SelectField>
            <TextField label="Disabled" disabled defaultValue="Cannot edit" />
            </div>
            <div className="space-y-3">
            <Checkbox label="Approve requests" defaultChecked />
            <Checkbox label="Reject requests" />
            </div>
        </Section>

        <Section title="Badges and status indicators">
            <div className="flex flex-wrap gap-2">
            {['pending', 'confirmed', 'rejected', 'cancelled', 'completed'].map((status) => (
                <StatusBadge key={status} status={status} />
            ))}
            </div>
            <div className="flex flex-wrap gap-2">
            {['queued', 'sent', 'failed', 'success'].map((status) => (
                <StatusBadge key={status} status={status} />
            ))}
            <Badge>Online</Badge>
            <Badge>In-person</Badge>
            </div>
        </Section>

        <Section title="Alerts">
            <Alert tone="warning" title="Time not available.">
            Overlaps a confirmed appointment (9:00–10:00 AM). Choose another time.
            </Alert>
            <Alert tone="success" title="Available.">
            No conflict with confirmed appointments.
            </Alert>
            <Alert tone="error">Incorrect email or password. Try again.</Alert>
        </Section>

        <Section title="Card and table">
            <Card
            flush
            title="Pending requests: needs your decision"
            action={<TextLink to="/">View all</TextLink>}
            >
            <Table>
                <thead>
                <tr>
                    <Th>Ref</Th>
                    <Th>Requester</Th>
                    <Th>Preferred time</Th>
                    <Th>Source</Th>
                    <Th>Status</Th>
                    <Th>
                    <span className="sr-only">Actions</span>
                    </Th>
                </tr>
                </thead>
                <tbody>
                <tr>
                    <Td className="font-mono text-sm">REQ-2026-0142</Td>
                    <Td>Maria Santos</Td>
                    <Td>Oct 27, 9:30 AM</Td>
                    <Td>
                    <Badge>Online</Badge>
                    </Td>
                    <Td>
                    <StatusBadge status="pending" />
                    </Td>
                    <Td>
                    <Button size="sm" variant="secondary">
                        Review
                    </Button>
                    </Td>
                </tr>
                <tr>
                    <Td className="font-mono text-sm">REQ-2026-0141</Td>
                    <Td>Juan Dela Cruz</Td>
                    <Td>Oct 28, 2:00 PM</Td>
                    <Td>
                    <Badge>In-person</Badge>
                    </Td>
                    <Td>
                    <StatusBadge status="pending" />
                    </Td>
                    <Td>
                    <Button size="sm" variant="secondary">
                        Review
                    </Button>
                    </Td>
                </tr>
                </tbody>
            </Table>
            </Card>
            <Card title="Card without a table">
            <p>Plain cards use padding around their content.</p>
            </Card>
        </Section>

        <Section title="Loading, empty and feedback states">
            <Card>
            <Spinner label="Loading requests…" />
            </Card>
            <Card>
            <EmptyState message="No matching records. Clear filters or try a different search." />
            </Card>
            <div className="flex flex-wrap gap-3">
            <Button
                variant="secondary"
                onClick={() =>
                toast.show({
                    tone: 'success',
                    title: 'Appointment confirmed.',
                    message: 'Confirmation email queued.',
                })
                }
            >
                Success toast
            </Button>
            <Button
                variant="secondary"
                onClick={() =>
                toast.show({
                    tone: 'warning',
                    title: 'Confirmed.',
                    message: 'The email could not be sent and will be retried. Status unchanged.',
                })
                }
            >
                Warning toast
            </Button>
            <Button
                variant="secondary"
                onClick={() =>
                toast.show({ tone: 'error', message: 'Something went wrong. Please try again.' })
                }
            >
                Error toast
            </Button>
            </div>
        </Section>

        <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Reject request"
            actions={
            <>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Keep as is
                </Button>
                <Button variant="danger" onClick={() => setModalOpen(false)}>
                Reject request
                </Button>
            </>
            }
        >
            <p className="text-muted">
            REQ-2026-0142 · Maria Santos. The requester is emailed the decision.
            </p>
            <TextField label="Reason" required placeholder="Explain the decision" />
        </Modal>
        </div>
    )
}

export default StyleGuidePage
