export { NedbSessionStoreAdapter } from './nedb-session-store-adapter'
export { WebSocketRegistry } from './web-socket-registry'
export { connectionsDatabase, subscriptionsDatabase } from './paths'

// Export a default instance for easy usage  
import { NedbSessionStoreAdapter } from './nedb-session-store-adapter'
export const sessionStore = new NedbSessionStoreAdapter()