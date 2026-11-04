import Alert from './Alert'
import Button from './Button'

function ErrorState({ message, onRetry }){
    return (
        <Alert tone="error">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span>{message}</span>
                <Button size="sm" variant="dangerOutline" onClick={onRetry}>
                Retry
                </Button>
            </div>
        </Alert>
    )
}
export default ErrorState