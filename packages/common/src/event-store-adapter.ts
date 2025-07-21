import { UUID } from './concepts'
import { BoosterConfig } from './config'
import {
  EntitySnapshotEnvelope,
  EntitySnapshotEnvelopeFromDatabase,
  EventDeleteParameters,
  EventEnvelope,
  EventEnvelopeFromDatabase,
  EventSearchParameters,
  EventSearchResponse,
  NonPersistedEntitySnapshotEnvelope,
  NonPersistedEventEnvelope,
  PaginatedEntitiesIdsResult,
  SnapshotDeleteParameters,
} from './envelope'
import { EventStream } from './stream-types'

export interface EventStoreAdapter {
  /**
   * Converts raw events data into an array of EventEnvelope objects
   *
   * @param rawEvents - The raw events data to be converted
   * @returns An array of EventEnvelope objects
   */
  rawToEnvelopes(rawEvents: unknown): Array<EventEnvelope>

  rawStreamToEnvelopes(config: BoosterConfig, context: unknown, dedupEventStream: EventStream): Array<EventEnvelope>

  dedupEventStream(config: BoosterConfig, rawEvents: unknown): Promise<EventStream>

  produce(
    entityName: string,
    entityID: UUID,
    eventEnvelopes: Array<EventEnvelope>,
    config: BoosterConfig
  ): Promise<void>

  /**
   * Retrieves events for a specific entity since a given time
   *
   * @param config - The Booster configuration object
   * @param entityTypeName - The type name of the entity
   * @param entityID - The ID of the entity
   * @param since - The time to retrieve events since (optional)
   * @returns A promise that resolves to an array of EventEnvelope objects
   */
  forEntitySince(
    config: BoosterConfig,
    entityTypeName: string,
    entityID: UUID,
    since?: string
  ): Promise<Array<EventEnvelope>>

  /**
   * Retrieves the latest snapshot of an entity
   *
   * @param config - The Booster configuration object
   * @param entityTypeName - The type name of the entity
   * @param entityID - The ID of the entity
   * @returns A promise that resolves to the latest EventEnvelope for the entity, or null if none exist
   */
  latestEntitySnapshot(
    config: BoosterConfig,
    entityTypeName: string,
    entityID: UUID
  ): Promise<EntitySnapshotEnvelope | undefined>

  /**
   * Searches for events based on specific parameters
   *
   * @param config - The Booster configuration object
   * @param parameters - The search parameters
   * @returns A promise that resolves to an array of EventSearchResponse objects
   */
  search(config: BoosterConfig, parameters: EventSearchParameters): Promise<Array<EventSearchResponse>>

  /**
   * Searches for entities IDs based on a specific entity type and pagination parameters
   *
   * @param config - The Booster configuration object
   * @param limit - The maximum number of entities IDs to retrieve
   * @param afterCursor - The cursor to retrieve entities IDs after (optional)
   * @param entityTypeName - The type name of the entities to search for
   * @returns A promise that resolves to a PaginatedEntitiesIdsResult object
   */
  searchEntitiesIDs(
    config: BoosterConfig,
    limit: number,
    afterCursor: Record<string, string> | undefined,
    entityTypeName: string
  ): Promise<PaginatedEntitiesIdsResult>

  /**
   * Streams an event to the corresponding event handler
   *
   * @param eventEnvelopes - The array of `NonPersistedEventEnvelope` objects to store
   * @param config - The Booster configuration object
   * @returns A promise that resolves with the list of `EventEnvelope`s when the events have been stored
   */
  store(eventEnvelopes: Array<NonPersistedEventEnvelope>, config: BoosterConfig): Promise<Array<EventEnvelope>>

  /**
   * Stores a snapshot of an entity
   *
   * @param snapshotEnvelope - The `NonPersistedEntitySnapshotEnvelope` object to store
   * @param config - The Booster configuration object
   * @returns A promise that resolves with the `EntitySnapshotEnvelope` when the snapshot has been stored
   */
  storeSnapshot(
    snapshotEnvelope: NonPersistedEntitySnapshotEnvelope,
    config: BoosterConfig
  ): Promise<EntitySnapshotEnvelope>

  /**
   * Stores an event envelope that has been dispatched in the dispatched events table.
   *
   * @param eventEnvelope - The `EventEnvelope` to store.
   * @param config - The Booster configuration object.
   * @returns `true` if the dispatched event was stored, `false` if the event already exists in the dispatched events
   * table, throws an error on any other type of error.
   */
  storeDispatched(eventEnvelope: EventEnvelope, config: BoosterConfig): Promise<boolean>

  /**
   * Find all events to be removed based on the parameters
   *
   * @param config
   * @param parameters
   */
  findDeletableEvent(
    config: BoosterConfig,
    parameters: EventDeleteParameters
  ): Promise<Array<EventEnvelopeFromDatabase>>

  /**
   * Find all snapshots to be removed based on the parameters
   *
   * @param config
   * @param parameters
   */
  findDeletableSnapshot(
    config: BoosterConfig,
    parameters: SnapshotDeleteParameters
  ): Promise<Array<EntitySnapshotEnvelopeFromDatabase>>

  /**
   * Delete events
   *
   * @param config
   * @param events
   */
  deleteEvent(config: BoosterConfig, events: Array<EventEnvelopeFromDatabase>): Promise<void>

  /**
   * Delete snapshots
   *
   * @param config
   * @param snapshots
   */
  deleteSnapshot(config: BoosterConfig, snapshots: Array<EntitySnapshotEnvelopeFromDatabase>): Promise<void>

  /**
   * Health check methods for the event store
   */
  healthCheck?: {
    /**
     * Check if the event store is up and running
     */
    isUp(config: BoosterConfig): Promise<boolean>
    
    /**
     * Get detailed health information about the event store
     */
    details(config: BoosterConfig): Promise<unknown>
    
    /**
     * Get the URLs/endpoints of the event store
     */
    urls(config: BoosterConfig): Promise<Array<string>>
  }
}