function PageHeader({ title, subtitle, action }){
    return (
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-ink lg:text-3xl">{title}</h1>
                {subtitle && <p className="mt-1 text-base text-muted">{subtitle}</p>}
            </div>
            {action}  
        </div>
    )
}
export default PageHeader