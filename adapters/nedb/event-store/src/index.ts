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

// Export the EventRegistry for backward compatibility
export { EventRegistry } from './event-registry'

// Create the NeDB Event Store Adapter
export function createNeDBEventStoreAdapter(userApp: UserApp): EventStoreAdapter {
  const eventRegistry = new EventRegistry()

  function notImplemented(): any {
    throw new Error('Not implemented for NeDB adapter')
  }

  return {
    rawToEnvelopes: rawEventsToEnvelopes,
    rawStreamToEnvelopes: notImplemented,
    dedupEventStream: notImplemented,
    produce: notImplemented,
    forEntitySince: (config: BoosterConfig, entityTypeName: string, entityID: UUID, since?: string) =>
      readEntityEventsSince(eventRegistry, config, entityTypeName, entityID, since),
    latestEntitySnapshot: (config: BoosterConfig, entityTypeName: string, entityID: UUID) =>
      readEntityLatestSnapshot(eventRegistry, config, entityTypeName, entityID),
    store: (eventEnvelopes: Array<NonPersistedEventEnvelope>, config: BoosterConfig) =>
      storeEvents(userApp, eventRegistry, eventEnvelopes, config),
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
  }
}

// Default export for convenience
export default createNeDBEventStoreAdapter