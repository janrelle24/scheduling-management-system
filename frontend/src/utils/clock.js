// The app's idea of "now". In this mock stage it is FIXED to the day shown in the
// UI designs, so ages like "2h ago" and "Today's appointments" match the screens.
// When the real backend exists, return new Date() here and nothing else changes.
export const MOCK_NOW_ISO = '2026-10-26T10:15:00+08:00'

export function getNow() {
    return new Date(MOCK_NOW_ISO)
}
