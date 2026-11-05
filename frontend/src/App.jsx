import { Navigate, Route, Routes } from 'react-router-dom'
import DevSessionSwitcher from './components/DevSessionSwitcher'
import SessionProvider from './context/SessionProvider'
import ToastProvider from './context/ToastProvider'
import { useSession } from './hooks/useSession'
import PublicLayout from './layouts/PublicLayout'
import StaffLayout from './layouts/StaffLayout'
import ComingSoonPage from './pages/ComingSoonPage'
import MorePage from './pages/MorePage'
import NotFoundPage from './pages/NotFoundPage'
import RequestFormPage from './pages/public/RequestFormPage'
import RequestSubmittedPage from './pages/public/RequestSubmittedPage'
import MockDataPage from './pages/dev/MockDataPage'
import StyleGuidePage from './pages/dev/StyleGuidePage'
import DashboardPage from './pages/staff/DashboardPage'
import RequestsPage from './pages/staff/RequestsPage'
import ProtectedRoute from './routes/ProtectedRoute'
import { NAV } from './routes/navigation'
import { PERMISSIONS } from './utils/permissions'

function SignInPlaceholder(){
  const { user } = useSession()
  if (user) return <Navigate to="dashboard" replace/>
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-ink">Sign in</h1>
      <p className="mt-2">
        The sign-in screen is built in a later feature. For now, use the DEV panel at the
        bottom-left to pick a simulated user.
      </p>
    </main>
  )
}
function App() {

  return (
    <SessionProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Public pages (placeholders until their features are built) */}
          <Route element={<PublicLayout/>}>
            <Route path="/request" element={<RequestFormPage />} />
            <Route path="/request/submitted" element={<RequestSubmittedPage />} />
          </Route>
          <Route path="/sign-in" element={<SignInPlaceholder />} />
          <Route path="/forgot-password" element={<ComingSoonPage standalone title="Forgot password" />} />
          <Route path="/reset-password" element={<ComingSoonPage standalone title="Set a new password" />} />
          <Route path="/signed-out" element={<ComingSoonPage standalone title="You've been signed out" />} />

          {/* Signed-in pages inside the staff layout */}
          <Route element={<StaffLayout/>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/requests"
              element={
                <ProtectedRoute item={NAV.requests}>
                  <RequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests/new"
              element={
                <ProtectedRoute requiresAny={[PERMISSIONS.REQUESTS_CREATE]} pageName="New In-Person Request">
                  <ComingSoonPage title="New In-Person Request" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests/:id"
              element={
                <ProtectedRoute requiresAny={[PERMISSIONS.REQUESTS_VIEW]} pageName="Request details">
                  <ComingSoonPage title="Request details" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute item={NAV.calendar}>
                  <ComingSoonPage title="Calendar" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute item={NAV.reports}>
                  <ComingSoonPage title="Reports" />
                </ProtectedRoute>
              }
            />
            <Route path="/more" element={<MorePage />} />
            <Route
              path="/admin/staff-accounts"
              element={
                <ProtectedRoute item={NAV.staffAccounts}>
                  <ComingSoonPage title="Staff Accounts" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute item={NAV.settings}>
                  <ComingSoonPage title="Scheduling Settings" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-log"
              element={
                <ProtectedRoute item={NAV.auditLog}>
                  <ComingSoonPage title="Audit Log" />
                </ProtectedRoute>
              }
            />
          </Route>
          {/* import.meta.env.DEV is false in production builds, so this route disappears. */}
          {import.meta.env.DEV && <Route path="/dev/style-guide" element={<StyleGuidePage />} />}
          {import.meta.env.DEV && <Route path="/dev/mock-data" element={<MockDataPage />} />}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        {import.meta.env.DEV && <DevSessionSwitcher />}
      </ToastProvider>
    </SessionProvider>
  )
}

export default App
