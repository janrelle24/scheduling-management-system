import { NavLink } from 'react-router-dom'
import Button from './ui/Button'
import { useSession } from '../hooks/useSession'
import { getVisibleNavItems } from '../routes/navigation'
import { cx } from '../utils/classNames'

function SidebarLink({ item }) {
    return (
        <NavLink
        to={item.to}
        className={({ isActive }) =>
            cx(
            'block rounded-lg px-3 py-2.5 text-base',
            isActive ? 'bg-brand-soft font-semibold text-brand' : 'text-body hover:bg-page',
            )
        }
        >
        {item.label}
        </NavLink>
    )
}

// Desktop sidebar (hidden below the lg breakpoint, where the bottom tabs are used).
function StaffSidebar() {
    const { user, signOut } = useSession()
    const items = getVisibleNavItems(user)
    const mainItems = items.filter((item) => item.section === 'main')
    const adminItems = items.filter((item) => item.section === 'admin')

    return (
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-r border-border bg-surface p-4 lg:block">
        <p className="px-3 pb-4 text-base font-bold text-brand">Vice Mayor's Office</p>
        <nav aria-label="Main">
            <ul className="flex flex-col gap-1">
            {mainItems.map((item) => (
                <li key={item.key}>
                <SidebarLink item={item} />
                </li>
            ))}
            </ul>
            {adminItems.length > 0 && (
            <>
                <p className="px-3 pt-5 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">
                Administration
                </p>
                <ul className="flex flex-col gap-1">
                {adminItems.map((item) => (
                    <li key={item.key}>
                    <SidebarLink item={item} />
                    </li>
                ))}
                </ul>
            </>
            )}
        </nav>
        <div className="mt-auto border-t border-border pt-4">
            <p className="truncate px-3 pb-2 text-sm text-muted">{user.fullName}</p>
            <Button variant="secondary" size="sm" className="w-full" onClick={signOut}>
                Sign out
            </Button>
        </div>
        </aside>
    )
}

export default StaffSidebar