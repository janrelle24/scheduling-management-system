import { useSearchParams } from 'react-router-dom'
import ButtonLink from '../../components/ui/ButtonLink'

// "You've been signed out". A 401 from the server sends people here with ?reason=timeout.
export default function SignedOutPage() {
    const [params] = useSearchParams()
    const timedOut = params.get('reason') === 'timeout'

    return (
        <div className="flex flex-col gap-4 text-center">
        <h1 className="text-xl font-bold text-ink">You've been signed out</h1>
        <p className="text-muted">{timedOut ? 'Your session timed out for security.' : 'Your session has ended.'}</p>
        <ButtonLink to="/sign-in" className="w-full">
            Sign in again
        </ButtonLink>
        </div>
    )
}
