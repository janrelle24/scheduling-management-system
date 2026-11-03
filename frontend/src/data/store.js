// The in-memory "database". It is rebuilt every time the page loads, so any change
// made while using the app is lost on refresh (nothing is saved anywhere).
// Services read from it now, and will write to it as write features are added.
// When the real backend exists, this file and seedData.js are no longer needed.
import { buildSeedData } from './seedData'
import { mockUsers } from './mockUsers'

export const db = {
    users: structuredClone(mockUsers),
    ...buildSeedData(),
}
