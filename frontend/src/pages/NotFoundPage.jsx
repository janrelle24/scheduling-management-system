import ButtonLink from '../components/ui/ButtonLink'
import Card from '../components/ui/Card'

// Not part of the approved designs; a minimal page so a wrong URL is never blank.
function NotFoundPage() {
    return (
        <main className="mx-auto max-w-xl p-6">
        <Card>
            <h1 className="text-2xl font-bold text-ink">Page not found</h1>
            <p className="mt-2 text-base">The page you are looking for does not exist.</p>
            <ButtonLink to="/dashboard" className="mt-5">
            Go to dashboard
            </ButtonLink>
        </Card>
        </main>
    )
}

export default NotFoundPage
