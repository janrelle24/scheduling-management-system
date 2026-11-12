import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import TextLink from '../components/ui/TextLink'
import PageHeader from '../components/PageHeader'
import { useSession } from '../hooks/useSession'
import { getVisibleNavItems } from '../routes/navigation'

// Mobile "More" tab. Not in the approved designs; lists the pages that don't
// fit in the bottom tabs, plus Sign out.
function MorePage() {
    const { user, signOut } = useSession()
    const adminItems = getVisibleNavItems(user).filter((item) => item.section === 'admin')

    return (
        <div className="flex flex-col gap-6">
        <PageHeader title="More" subtitle={`Signed in as ${user.fullName}`} />
        <Card>
            {adminItems.length > 0 && (
            <ul className="mb-5 flex flex-col gap-3">
                {adminItems.map((item) => (
                <li key={item.key}>
                    <TextLink to={item.to}>{item.label}</TextLink>
                </li>
                ))}
            </ul>
            )}
            <Button variant="secondary" onClick={signOut}>
                Sign out
            </Button>
        </Card>
        </div>
    )
}

export default MorePage