import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

// Keeps a list's filters and page number in the URL (?q=…&action=…&page=2), so Back, bookmarks and
// shared links work. Returns:
//   params          the URLSearchParams (read the values with the page's own reader)
//   update(changes) write changes; any change except `page` sends you back to page 1.
//                   { replace: false } adds a history entry (use it for paging)
//   clear()         empties every filter in `filterNames` (pass a constant array)
//   setParams       for things like switching tabs
export function useUrlListState(filterNames) {
    const [params, setParams] = useSearchParams()

    // The updater form (previous => next) always starts from the CURRENT address.
    const update = useCallback(
        (changes, { replace = true } = {}) => {
        setParams(
            (previous) => {
            const next = new URLSearchParams(previous)
            for (const [name, value] of Object.entries(changes)) {
                if (value) next.set(name, String(value))
                else next.delete(name)
            }
            if (!('page' in changes) || Number(changes.page) <= 1) next.delete('page')
            return next
            },
            { replace },
        )
        },
        [setParams],
    )

    const clear = useCallback(
        () => update(Object.fromEntries(filterNames.map((name) => [name, '']))),
        [update, filterNames],
    )

    return { params, update, clear, setParams }
}