export { MemorySessionStoreAdapter } from './memory-session-store-adapter'

// Export a default instance for easy usage
import { MemorySessionStoreAdapter } from './memory-session-store-adapter'
export const sessionStore = new MemorySessionStoreAdapter()
