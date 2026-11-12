import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { Table, Td, Th } from '../ui/Table'
import { cx } from '../../utils/classNames'
import { ROLE_LABELS } from '../../utils/accountPermissions'

// Name (with email), Role, Status and an Edit button. The row being edited is highlighted.
function AccountList({ accounts, selectedId, onEdit }) {
    return (
        <Table label="Staff accounts">
            <thead>
            <tr>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>
                <span className="sr-only">Action</span>
                </Th>
            </tr>
            </thead>
            <tbody>
            {accounts.map((account) => (
                <tr key={account.id} className={cx(account.id === selectedId && 'bg-brand-soft')}>
                <Td>
                    <span className="block font-semibold text-ink">{account.fullName}</span>
                    <span className="block text-sm break-all text-muted">{account.email}</span>
                </Td>
                <Td>{ROLE_LABELS[account.role]}</Td>
                <Td>
                    <Badge tone={account.isActive ? 'confirmed' : 'neutral'}>{account.isActive ? 'Active' : 'Inactive'}</Badge>
                </Td>
                <Td>
                    <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Edit ${account.fullName}`}
                    aria-current={account.id === selectedId ? 'true' : undefined}
                    onClick={() => onEdit(account.id)}
                    >
                    Edit
                    </Button>
                </Td>
                </tr>
            ))}
            </tbody>
        </Table>
    )
}

export default AccountList