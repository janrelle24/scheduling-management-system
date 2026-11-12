import { Outlet } from 'react-router-dom'
import DemoNotice from '../components/DemoNotice'
import Card from '../components/ui/Card'

// Shell for the small centered cards: Forgot password, Set a new password, Signed out.
export default function AuthLayout() {
    return (
        <div className="min-h-screen bg-page">
        <DemoNotice />
        <main id="main" className="mx-auto flex max-w-md flex-col gap-4 px-5 py-10 sm:py-16">
            <p className="text-base font-bold text-brand">Office of the Vice Mayor</p>
            <Card>
            <Outlet />
            </Card>
        </main>
        </div>
    )
}
