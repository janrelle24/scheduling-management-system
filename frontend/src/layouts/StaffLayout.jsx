import { Navigate, Outlet, useLocation } from 'react-router-dom'
import DemoNotice from '../components/DemoNotice'
import MobileTabBar from '../components/MobileTabBar'
import StaffSidebar from '../components/StaffSidebar'
import { useSession } from '../hooks/useSession'

// Shell for every signed-in page: sidebar on desktop, top bar + bottom tabs on mobile.
function StaffLayout() {
    const { user } = useSession()
    const location = useLocation()
    // Not signed in: go to sign-in, and come back to this page afterwards.
    if (!user) return <Navigate to="/sign-in" replace state={{ from: location }} />

    return (
        <div className="min-h-screen lg:flex">
        <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
        >
            Skip to main content
        </a>
        <StaffSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
            <DemoNotice />
            <header className="border-b border-border bg-surface px-4 py-4 lg:hidden">
            <p className="text-base font-bold text-brand">Vice Mayor's Office</p>
            </header>
            <main id="main" tabIndex={-1} className="flex-1 p-4 pb-24 lg:p-8">
            <Outlet />
            </main>
        </div>
        <MobileTabBar />
        </div>
    )
}

export default StaffLayout
