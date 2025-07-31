import { ReadModelStoreAdapter } from '@booster-ai/common'

// Default no-op implementations for all ReadModelStoreAdapter methods
const defaultReadModelStoreAdapter: ReadModelStoreAdapter = {
  fetch: async () => undefined,
  search: async () => ({ items: [], count: 0 }),
  store: async (config, readModelName, readModel) => readModel,
  delete: async () => {},
  rawToEnvelopes: () => [],
}

/**
 * Creates a mock ReadModelStoreAdapter with type safety
 * @param overrides - Partial ReadModelStoreAdapter to override specific methods
 * @returns A fully-typed ReadModelStoreAdapter mock
 */
export function createMockReadModelStoreAdapter(overrides: Partial<ReadModelStoreAdapter> = {}): ReadModelStoreAdapter {
  return {
    ...defaultReadModelStoreAdapter,
    ...overrides,
  }
}