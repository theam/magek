import { EventStoreAdapter } from '@booster-ai/common'

// Default no-op implementations for all EventStoreAdapter methods
const defaultEventStoreAdapter: EventStoreAdapter = {
  rawToEnvelopes: () => [],
  rawStreamToEnvelopes: () => [],
  dedupEventStream: async () => [],
  produce: async () => {},
  forEntitySince: async () => [],
  latestEntitySnapshot: async () => undefined,
  store: async () => [],
  storeSnapshot: async () => ({} as any),
  search: async () => [],
  searchEntitiesIDs: async () => ({ items: [], afterCursor: undefined }),
  storeDispatched: async () => true,
  findDeletableEvent: async () => [],
  findDeletableSnapshot: async () => [],
  deleteEvent: async () => {},
  deleteSnapshot: async () => {},
}

/**
 * Creates a mock EventStoreAdapter with type safety
 * @param overrides - Partial EventStoreAdapter to override specific methods
 * @returns A fully-typed EventStoreAdapter mock
 */
export function createMockEventStoreAdapter(overrides: Partial<EventStoreAdapter> = {}): EventStoreAdapter {
  return {
    ...defaultEventStoreAdapter,
    ...overrides,
  }
}