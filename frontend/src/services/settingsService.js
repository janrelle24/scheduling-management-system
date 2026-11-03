// Mirrors: GET /api/v1/admin/scheduling-settings  (saving comes with the Settings feature)
import { db } from '../data/store'
import { mockApi } from './mockApi'

export function getSchedulingSettings() {
    return mockApi(() => db.settings)
}
