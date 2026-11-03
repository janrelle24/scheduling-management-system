import ButtonLink from '../components/ui/ButtonLink'
import Card from '../components/ui/Card'

function NoPermissionPage({ pageName = 'this page' }) {
    return (
        <Card className="max-w-xl">
        <h1 className="text-2xl font-bold text-ink">You don't have permission to open this page</h1>
        <p className="mt-2 text-base">
            Your account can't access {pageName}. Ask an administrator if you need access.
        </p>
        <ButtonLink to="/dashboard" className="mt-5">
            Back to dashboard
        </ButtonLink>
        </Card>
    )
}

export default NoPermissionPage