import NoPermissionPage from '../pages/NoPermissionPage'
import { useSession } from '../hooks/useSession'
import { hasAnyPermission } from '../utils/permissions'

// Shows the page only if the user has one of the required permissions.
// Pass `item` (from NAV) or `requiresAny` + `pageName`.
// This is a UI convenience only. The backend must enforce permissions too.
function ProtectedRoute({
    item,
    requiresAny = item?.requiresAny,
    pageName = item?.label,
    children,
}) {
    const { user } = useSession()
    if (!hasAnyPermission(user, requiresAny)) {
        return <NoPermissionPage pageName={pageName} />
    }
    return children
}

export default ProtectedRoute