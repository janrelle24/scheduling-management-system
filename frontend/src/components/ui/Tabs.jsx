import { useRef } from 'react'
import { cx } from '../../utils/classNames'

function Tabs({ tabs, value, onChange, label, idPrefix }){
    const buttons = useRef({})

    function handleKeyDown(event, index) {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
        event.preventDefault()
        const step = event.key === 'ArrowRight' ? 1 : -1
        const next = tabs[(index + step + tabs.length) % tabs.length]
        onChange(next.key)
        buttons.current[next.key]?.focus()
    }

    return (
        <div role="tablist" aria-label={label} className="flex gap-2">
            {tabs.map((tab, index) => {
                const selected = tab.key === value
                return (
                <button
                    key={tab.key}
                    ref={(element) => {
                    buttons.current[tab.key] = element
                    }}
                    type="button"
                    role="tab"
                    id={`${idPrefix}-tab-${tab.key}`}
                    aria-selected={selected}
                    aria-controls={`${idPrefix}-panel`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => onChange(tab.key)}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                    className={cx(
                    'min-h-11 rounded-lg border px-4 text-base font-semibold transition-colors',
                    selected
                        ? 'border-brand bg-brand text-white'
                        : 'border-brand bg-surface text-brand hover:bg-brand-soft',
                    )}
                >
                    {tab.label}
                </button>
                )
            })}
        </div>
    )
}
export default Tabs