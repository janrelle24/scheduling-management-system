import { SOURCE_LABELS } from './status'

export const PAGE_SIZE = 10

const isDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? '')

export function readListParams(params, allowedStatuses) {
    const status = params.get('status')
    const source = params.get('source')
    const page = Number.parseInt(params.get('page') ?? '', 10)
    return {
        q: (params.get('q') ?? '').slice(0, 100),
        status: allowedStatuses.includes(status) ? status : '',
        source: Object.keys(SOURCE_LABELS).includes(source) ? source : '',
        dateFrom: isDateString(params.get('dateFrom')) ? params.get('dateFrom') : '',
        dateTo: isDateString(params.get('dateTo')) ? params.get('dateTo') : '',
        page: Number.isInteger(page) && page >= 1 ? page : 1,
    }
}

export const hasActiveFilters = (filters) =>
    Boolean(filters.q || filters.status || filters.source || filters.dateFrom || filters.dateTo)
