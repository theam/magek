import { SessionStoreAdapter } from '@magek/common'

// Default no-op implementations for all SessionStoreAdapter methods
const defaultSessionStoreAdapter: SessionStoreAdapter = {
  storeConnection: async () => {},
  fetchConnection: async () => undefined,
  deleteConnection: async () => {},
  storeSubscription: async () => {},
  fetchSubscription: async () => undefined,
  deleteSubscription: async () => {},
  fetchSubscriptionsForConnection: async () => [],
  deleteSubscriptionsForConnection: async () => {},
  fetchSubscriptionsByClassName: async () => [],
}

/**
 * Creates a mock SessionStoreAdapter with type safety
 * @param overrides - Partial SessionStoreAdapter to override specific methods
 * @returns A fully-typed SessionStoreAdapter mock
 */
export function createMockSessionStoreAdapter(overrides: Partial<SessionStoreAdapter> = {}): SessionStoreAdapter {
  return {
    ...defaultSessionStoreAdapter,
    ...overrides,
  }
}
