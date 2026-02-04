import { UUID } from './concepts'
import { MagekConfig } from './config'
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

  /**
   * Converts raw stream data into an array of EventEnvelope objects.
   *
   * @param config - The Magek configuration object
   * @param context - The context from the raw stream
   * @param dedupEventStream - The deduplicated event stream
   * @returns An array of EventEnvelope objects
   */
  rawStreamToEnvelopes(config: MagekConfig, context: unknown, dedupEventStream: EventStream): Array<EventEnvelope>

  /**
   * Deduplicates raw events and returns them as an EventStream.
   *
   * @param config - The Magek configuration object
   * @param rawEvents - The raw events data to deduplicate
   * @returns A promise that resolves to a deduplicated EventStream
   */
  dedupEventStream(config: MagekConfig, rawEvents: unknown): Promise<EventStream>

  /**
   * Produces events to an external event stream (e.g., Kafka).
   *
   * @param entityName - The name of the entity type
   * @param entityID - The unique identifier of the entity
   * @param eventEnvelopes - The array of EventEnvelope objects to produce
   * @param config - The Magek configuration object
   * @returns A promise that resolves when events are produced
   */
  produce(
    entityName: string,
    entityID: UUID,
    eventEnvelopes: Array<EventEnvelope>,
    config: MagekConfig
  ): Promise<void>

  /**
   * Retrieves events for a specific entity since a given time
   *
   * @param config - The Magek configuration object
   * @param entityTypeName - The type name of the entity
   * @param entityID - The ID of the entity
   * @param since - The time to retrieve events since (optional)
   * @returns A promise that resolves to an array of EventEnvelope objects
   */
  forEntitySince(
    config: MagekConfig,
    entityTypeName: string,
    entityID: UUID,
    since?: string
  ): Promise<Array<EventEnvelope>>

  /**
   * Retrieves the latest snapshot of an entity
   *
   * @param config - The Magek configuration object
   * @param entityTypeName - The type name of the entity
   * @param entityID - The ID of the entity
   * @returns A promise that resolves to the latest EventEnvelope for the entity, or null if none exist
   */
  latestEntitySnapshot(
    config: MagekConfig,
    entityTypeName: string,
    entityID: UUID
  ): Promise<EntitySnapshotEnvelope | undefined>

  /**
   * Searches for events based on specific parameters
   *
   * @param config - The Magek configuration object
   * @param parameters - The search parameters
   * @returns A promise that resolves to an array of EventSearchResponse objects
   */
  search(config: MagekConfig, parameters: EventSearchParameters): Promise<Array<EventSearchResponse>>

  /**
   * Searches for entities IDs based on a specific entity type and pagination parameters
   *
   * @param config - The Magek configuration object
   * @param limit - The maximum number of entities IDs to retrieve
   * @param afterCursor - The cursor to retrieve entities IDs after (optional)
   * @param entityTypeName - The type name of the entities to search for
   * @returns A promise that resolves to a PaginatedEntitiesIdsResult object
   */
  searchEntitiesIDs(
    config: MagekConfig,
    limit: number,
    afterCursor: Record<string, string> | undefined,
    entityTypeName: string
  ): Promise<PaginatedEntitiesIdsResult>

  /**
   * Streams an event to the corresponding event handler
   *
   * @param eventEnvelopes - The array of `NonPersistedEventEnvelope` objects to store
   * @param config - The Magek configuration object
   * @returns A promise that resolves with the list of `EventEnvelope`s when the events have been stored
   */
  store(eventEnvelopes: Array<NonPersistedEventEnvelope>, config: MagekConfig): Promise<Array<EventEnvelope>>

  /**
   * Stores a snapshot of an entity
   *
   * @param snapshotEnvelope - The `NonPersistedEntitySnapshotEnvelope` object to store
   * @param config - The Magek configuration object
   * @returns A promise that resolves with the `EntitySnapshotEnvelope` when the snapshot has been stored
   */
  storeSnapshot(
    snapshotEnvelope: NonPersistedEntitySnapshotEnvelope,
    config: MagekConfig
  ): Promise<EntitySnapshotEnvelope>

  /**
   * Stores an event envelope that has been dispatched in the dispatched events table.
   *
   * @param eventEnvelope - The `EventEnvelope` to store.
   * @param config - The Magek configuration object.
   * @returns `true` if the dispatched event was stored, `false` if the event already exists in the dispatched events
   * table, throws an error on any other type of error.
   */
  storeDispatched(eventEnvelope: EventEnvelope, config: MagekConfig): Promise<boolean>

  /**
   * Finds all events matching the deletion criteria.
   *
   * @param config - The Magek configuration object
   * @param parameters - The parameters specifying which events to find for deletion
   * @returns A promise that resolves to an array of EventEnvelopeFromDatabase objects
   */
  findDeletableEvent(
    config: MagekConfig,
    parameters: EventDeleteParameters
  ): Promise<Array<EventEnvelopeFromDatabase>>

  /**
   * Finds all snapshots matching the deletion criteria.
   *
   * @param config - The Magek configuration object
   * @param parameters - The parameters specifying which snapshots to find for deletion
   * @returns A promise that resolves to an array of EntitySnapshotEnvelopeFromDatabase objects
   */
  findDeletableSnapshot(
    config: MagekConfig,
    parameters: SnapshotDeleteParameters
  ): Promise<Array<EntitySnapshotEnvelopeFromDatabase>>

  /**
   * Soft-deletes events by marking them with a deletedAt timestamp.
   *
   * @param config - The Magek configuration object
   * @param events - The array of events to delete
   * @returns A promise that resolves when the events are deleted
   */
  deleteEvent(config: MagekConfig, events: Array<EventEnvelopeFromDatabase>): Promise<void>

  /**
   * Soft-deletes snapshots by marking them with a deletedAt timestamp.
   *
   * @param config - The Magek configuration object
   * @param snapshots - The array of snapshots to delete
   * @returns A promise that resolves when the snapshots are deleted
   */
  deleteSnapshot(config: MagekConfig, snapshots: Array<EntitySnapshotEnvelopeFromDatabase>): Promise<void>

  /**
   * Health check methods for the event store.
   */
  healthCheck?: {
    /**
     * Checks if the event store is up and running.
     *
     * @param config - The Magek configuration object
     * @returns A promise that resolves to true if the event store is healthy
     */
    isUp(config: MagekConfig): Promise<boolean>

    /**
     * Gets detailed health information about the event store.
     *
     * @param config - The Magek configuration object
     * @returns A promise that resolves to health details
     */
    details(config: MagekConfig): Promise<unknown>

    /**
     * Gets the URLs/endpoints of the event store.
     *
     * @param config - The Magek configuration object
     * @returns A promise that resolves to an array of URL strings
     */
    urls(config: MagekConfig): Promise<Array<string>>
  }

  /**
   * Fetches the next batch of unprocessed events.
   * The adapter manages the cursor internally to track processing position.
   * Batch size is read from config.eventProcessingBatchSize.
   *
   * @param config - The Magek configuration object
   * @returns A promise that resolves to an array of EventEnvelope objects
   */
  fetchUnprocessedEvents?(config: MagekConfig): Promise<Array<EventEnvelope>>

  /**
   * Marks a single event as processed and advances the internal cursor.
   * Should be called after each event has been successfully dispatched.
   *
   * @param config - The Magek configuration object
   * @param eventId - The ID of the event that was processed
   * @returns A promise that resolves when the event is marked and cursor is updated
   */
  markEventProcessed?(config: MagekConfig, eventId: UUID): Promise<void>
}