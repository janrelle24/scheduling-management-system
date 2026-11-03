// Thin strip telling people the data is simulated. Not in the approved designs.
// To remove it everywhere, set SHOW_DEMO_NOTICE to false.
const SHOW_DEMO_NOTICE = true

function DemoNotice() {
    if (!SHOW_DEMO_NOTICE) return null
    return (
        <p className="border-b border-pending-border bg-pending-bg px-4 py-1.5 text-center text-sm text-pending-fg">
        Demo mode: sample data, nothing is saved.
        </p>
    )
}

export default DemoNotice