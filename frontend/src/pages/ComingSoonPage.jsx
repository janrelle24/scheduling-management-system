import Card from '../components/ui/Card'
import PageHeader from '../components/PageHeader'

// Placeholder shown for screens that are built in a later feature.
// standalone: for pages outside the staff layout (adds its own spacing).
function ComingSoonPage({ title, standalone = false }) {
    const content = (
        <div className="flex flex-col gap-6">
        <PageHeader title={title} />
        <Card>
            <p>This screen will be built in a later feature.</p>
        </Card>
        </div>
    )
    return standalone ? <main className="mx-auto max-w-2xl p-6">{content}</main> : content
}

export default ComingSoonPage