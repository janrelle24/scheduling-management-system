// Joins class names and skips empty values:
// cx('a', false && 'b', 'c') -> 'a c'
export function cx(...parts) {
    return parts.filter(Boolean).join(' ')
}
