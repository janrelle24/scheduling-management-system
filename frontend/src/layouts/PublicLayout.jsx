import { Outlet } from 'react-router-dom'
import DemoNotice from '../components/DemoNotice'

// Shell for the public (no sign-in) pages. Phone: full-width white page like the design.
// Larger screens: the same content in a centered card (only mobile was designed).
function PublicLayout() {
    return (
        <div className="min-h-screen bg-surface sm:bg-page">
        <DemoNotice />
        <div className="mx-auto max-w-xl px-5 py-6 sm:py-10">
            <p className="text-base font-bold text-brand">Office of the Vice Mayor</p>
            <main className="mt-4 sm:rounded-lg sm:border sm:border-border sm:bg-surface sm:p-8">
            <Outlet />
            </main>
        </div>
        </div>
    )
}

export default PublicLayout