import { Link } from 'react-router-dom'
import { buttonClass } from './buttonStyles'

// A link (navigates to another page) that looks like a button.
// Use Button for actions, ButtonLink for navigation.
function ButtonLink({ variant = 'primary', size = 'md', className, ...props }) {
    return <Link className={buttonClass(variant, size, className)} {...props} />
}

export default ButtonLink
