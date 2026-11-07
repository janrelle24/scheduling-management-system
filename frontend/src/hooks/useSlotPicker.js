import { useCallback, useState } from 'react'
import { useAsyncData } from './useAsyncData'
import { useDebouncedValue } from './useDebouncedValue'
import { checkAvailability } from '../services/appointmentService'
import { getManilaDateStr, getManilaTimeStr, manilaIso } from '../utils/datetime'

// The date / start / end fields of Approve and Reschedule, plus the live availability check.
// The check is only a PREVIEW; the server repeats it when the action is confirmed.
//   initialStartAt, initialEndAt   where the fields start
//   excludeAppointmentId           when moving an appointment, so its own slot is not a conflict
//   currentStartAt, currentEndAt   when moving an appointment: the time it already has, which
//                                  is not a valid "new" time (unchanged = true)

export function useSlotPicker({
    initialStartAt,
    initialEndAt,
    excludeAppointmentId = null,
    currentStartAt = null,
    currentEndAt = null,
}) {
    const [date, setDate] = useState(getManilaDateStr(initialStartAt))
    const [start, setStart] = useState(getManilaTimeStr(initialStartAt))
    const [end, setEnd] = useState(getManilaTimeStr(initialEndAt))

    // Wait for a pause in editing before asking the server whether the time is free.
    const inputKey = `${date}|${start}|${end}`
    const checkedKey = useDebouncedValue(inputKey, 300)
    const [checkedDate, checkedStart, checkedEnd] = checkedKey.split('|')
    const complete = Boolean(checkedDate && checkedStart && checkedEnd)

    const load = useCallback(
        () =>
            complete
            ? checkAvailability({
                startAt: manilaIso(checkedDate, checkedStart),
                endAt: manilaIso(checkedDate, checkedEnd),
                excludeAppointmentId,
                })
            : Promise.resolve(null),
        [complete, checkedDate, checkedStart, checkedEnd, excludeAppointmentId],
    )
    const check = useAsyncData(load)

    const startAt = date && start ? manilaIso(date, start) : null
    const endAt = date && end ? manilaIso(date, end) : null
    const sameInstant = (a, b) => new Date(a).getTime() === new Date(b).getTime()
    const unchanged = Boolean(
        currentStartAt && startAt && endAt && sameInstant(startAt, currentStartAt) && sameInstant(endAt, currentEndAt),
    )
    const waiting = inputKey !== checkedKey || check.status === 'loading'
    const available = !unchanged && !waiting && check.status === 'success' && check.data?.available === true

    function applySuggestion(suggestion) {
        setDate(getManilaDateStr(suggestion.startAt))
        setStart(getManilaTimeStr(suggestion.startAt))
        setEnd(getManilaTimeStr(suggestion.endAt))
    }

    return {
        date, start, end, setDate, setStart, setEnd,
        startAt, endAt, complete, check, waiting, available, unchanged, applySuggestion,
        editing: inputKey !== checkedKey,
    }
}