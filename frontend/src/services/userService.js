// Mirrors: GET /api/v1/users  (create/update come with the Staff Accounts feature)
import { db } from '../data/store'
import { mockApi } from './mockApi'

export function listUsers() {
    return mockApi(() => db.users)
}
