import {
  UUID,
  UserApp,
  BoosterConfig,
  NonPersistedEventEnvelope,
  NonPersistedEntitySnapshotEnvelope,
  EventSearchParameters,
  EventDeleteParameters,
  EventEnvelopeFromDatabase,
  SnapshotDeleteParameters,
  EntitySnapshotEnvelopeFromDatabase,
  EventStoreAdapter,
} from '@booster-ai/common'
import { EventRegistry } from './event-registry'
import {
  rawEventsToEnvelopes,
  readEntityEventsSince,
  readEntityLatestSnapshot,
  storeEvents,
  storeSnapshot,
  storeDispatchedEvent,
} from './library/events-adapter'
import { searchEntitiesIds, searchEvents } from './library/events-search-adapter'
import {
  deleteEvent,
  deleteSnapshot,
  findDeletableEvent,
  findDeletableSnapshot,
} from './library/event-delete-adapter'
import { eventsDatabase } from './paths'
import { existsSync } from 'fs'
import * as path from 'path'



// Pre-built NeDB Event Store Adapter instance
const eventRegistry = new EventRegistry()

function notImplemented(): any {
  throw new Error('Not implemented for NeDB adapter')
}

async function countAll(database: any): Promise<number> {
  await database.loadDatabaseAsync()
  const count = await database.countAsync({})
  return count ?? 0
}

// Function to get userApp from config or load it from standard location
function getUserApp(config: BoosterConfig): UserApp {
  // Check if userApp is attached to config
  if ((config as any).userApp) {
    return (config as any).userApp
  }
  
  // Fallback to loading from standard location
  try {
    return require(path.join(process.cwd(), 'dist', 'index.js'))
  } catch (error) {
    throw new Error('Could not load userApp from config or standard location')
  }
}

export const eventStore: EventStoreAdapter = {
  rawToEnvelopes: rawEventsToEnvelopes,
  rawStreamToEnvelopes: notImplemented,
  dedupEventStream: notImplemented,
  produce: notImplemented,
  forEntitySince: (config: BoosterConfig, entityTypeName: string, entityID: UUID, since?: string) =>
    readEntityEventsSince(eventRegistry, config, entityTypeName, entityID, since),
  latestEntitySnapshot: (config: BoosterConfig, entityTypeName: string, entityID: UUID) =>
    readEntityLatestSnapshot(eventRegistry, config, entityTypeName, entityID),
  store: (eventEnvelopes: Array<NonPersistedEventEnvelope>, config: BoosterConfig) => {
    const userApp = getUserApp(config)
    return storeEvents(userApp, eventRegistry, eventEnvelopes, config)
  },
  storeSnapshot: (snapshotEnvelope: NonPersistedEntitySnapshotEnvelope, config: BoosterConfig) =>
    storeSnapshot(eventRegistry, snapshotEnvelope, config),
  search: (config: BoosterConfig, parameters: EventSearchParameters) =>
    searchEvents(eventRegistry, config, parameters),
  searchEntitiesIDs: (
    config: BoosterConfig,
    limit: number,
    afterCursor: Record<string, string> | undefined,
    entityTypeName: string
  ) => searchEntitiesIds(eventRegistry, config, limit, afterCursor, entityTypeName),
  storeDispatched: () => storeDispatchedEvent(),
  findDeletableEvent: (config: BoosterConfig, parameters: EventDeleteParameters) =>
    findDeletableEvent(eventRegistry, config, parameters),
  findDeletableSnapshot: (config: BoosterConfig, parameters: SnapshotDeleteParameters) =>
    findDeletableSnapshot(eventRegistry, config, parameters),
  deleteEvent: (config: BoosterConfig, events: Array<EventEnvelopeFromDatabase>) =>
    deleteEvent(eventRegistry, config, events),
  deleteSnapshot: (config: BoosterConfig, snapshots: Array<EntitySnapshotEnvelopeFromDatabase>) =>
    deleteSnapshot(eventRegistry, config, snapshots),
  healthCheck: {
    isUp: async () => existsSync(eventsDatabase),
    details: async () => {
      const count = await countAll(eventRegistry.events)
      return {
        file: eventsDatabase,
        count: count,
      }
    },
    urls: async () => [eventsDatabase],
  },
}