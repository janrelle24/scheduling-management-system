function EmptyState({ message, action}){
    return (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-muted">
            <p>{message}</p>
            {action}
        </div>
    )
}
export default EmptyState