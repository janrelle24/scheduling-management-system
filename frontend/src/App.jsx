import { Navigate, Route, Routes } from 'react-router-dom'
import DevSessionSwitcher from './components/DevSessionSwitcher'
import SessionProvider from './context/SessionProvider'
import ToastProvider from './context/ToastProvider'
import AuthLayout from './layouts/AuthLayout'
import PublicLayout from './layouts/PublicLayout'
import StaffLayout from './layouts/StaffLayout'
import ComingSoonPage from './pages/ComingSoonPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import SignInPage from './pages/auth/SignInPage'
import SignedOutPage from './pages/auth/SignedOutPage'
import MorePage from './pages/MorePage'
import NotFoundPage from './pages/NotFoundPage'
import RequestFormPage from './pages/public/RequestFormPage'
import RequestSubmittedPage from './pages/public/RequestSubmittedPage'
import MockDataPage from './pages/dev/MockDataPage'
import StyleGuidePage from './pages/dev/StyleGuidePage'
import CalendarPage from './pages/staff/CalendarPage'
import DashboardPage from './pages/staff/DashboardPage'
import NewInPersonRequestPage from './pages/staff/NewInPersonRequestPage'
import RequestDetailPage from './pages/staff/RequestDetailPage'
import RequestsPage from './pages/staff/RequestsPage'
import StaffAccountsPage from './pages/staff/StaffAccountsPage'
import ProtectedRoute from './routes/ProtectedRoute'
import { NAV } from './routes/navigation'
import { PERMISSIONS } from './utils/permissions'


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
          <Route path="/sign-in" element={<SignInPage />} />
          <Route element={<AuthLayout />}>
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/signed-out" element={<SignedOutPage />} />
          </Route>
          

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
                  <NewInPersonRequestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests/:id"
              element={
                <ProtectedRoute requiresAny={[PERMISSIONS.REQUESTS_VIEW]} pageName="Request details">
                  <RequestDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute item={NAV.calendar}>
                  <CalendarPage />
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
                  <StaffAccountsPage />
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
