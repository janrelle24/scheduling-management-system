import { cx } from '../../utils/classNames'

function Checkbox({ label, className, ...inputProps}){
    return (
        <label className={cx('flex items-center gap-3 text-base text-ink', className)}>
            <input type="checkbox" className="size-5 shrink-0 accent-brand" {...inputProps} />
            {label}
        </label>
    )
}
export default Checkbox