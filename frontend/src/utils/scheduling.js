// True if two time ranges overlap. Ranges are half-open: start included, end excluded,
// so 9:00-10:00 and 10:00-10:30 do NOT overlap, but 9:00-10:00 and 9:30-10:30 do.
export function overlaps(aStartIso, aEndIso, bStartIso, bEndIso) {
    return new Date(aStartIso) < new Date(bEndIso) && new Date(bStartIso) < new Date(aEndIso)
}
