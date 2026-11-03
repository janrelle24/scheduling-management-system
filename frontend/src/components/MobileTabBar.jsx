import { Link, NavLink, useLocation } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { getVisibleNavItems } from '../routes/navigation'
import { cx } from '../utils/classNames'

const tabClass = (active) =>
    cx(
        'flex min-h-14 flex-1 items-center justify-center border-t-2 px-1 text-sm',
        active ? 'border-brand font-semibold text-brand' : 'border-transparent text-muted',
    )

// Bottom tabs for phones and tablets (hidden at the lg breakpoint and above).
// Tabs the user has no permission for are left out. "More" is always shown.
function MobileTabBar() {
    const { user } = useSession()
    const { pathname } = useLocation()
    const tabs = getVisibleNavItems(user).filter((item) => item.mobileTab)
    const moreActive = pathname === '/more' || pathname.startsWith('/admin')

    return (
        <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface lg:hidden"
        >
        {tabs.map((item) => (
            <NavLink
            key={item.key}
            to={item.to}
            className={({ isActive }) => tabClass(isActive)}
            >
            {item.mobileLabel ?? item.label}
            </NavLink>
        ))}
        <Link
            to="/more"
            aria-current={moreActive ? 'page' : undefined}
            className={tabClass(moreActive)}
        >
            More
        </Link>
        </nav>
    )
}

export default MobileTabBar
