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
import { UUID } from './concepts'
import { EventStream } from './stream-types'

export interface EventStoreAdapter {
  rawToEnvelopes(rawEvents: unknown): Array<EventEnvelope>
  rawStreamToEnvelopes(
    config: BoosterConfig,
    context: unknown,
    dedupEventStream: EventStream
  ): Array<EventEnvelope>
  dedupEventStream(config: BoosterConfig, rawEvents: unknown): Promise<EventStream>
  produce(
    entityName: string,
    entityID: UUID,
    eventEnvelopes: Array<EventEnvelope>,
    config: BoosterConfig
  ): Promise<void>
  forEntitySince(
    config: BoosterConfig,
    entityTypeName: string,
    entityID: UUID,
    since?: string
  ): Promise<Array<EventEnvelope>>
  latestEntitySnapshot(
    config: BoosterConfig,
    entityTypeName: string,
    entityID: UUID
  ): Promise<EntitySnapshotEnvelope | undefined>
  search(config: BoosterConfig, parameters: EventSearchParameters): Promise<Array<EventSearchResponse>>
  searchEntitiesIDs(
    config: BoosterConfig,
    limit: number,
    afterCursor: Record<string, string> | undefined,
    entityTypeName: string
  ): Promise<PaginatedEntitiesIdsResult>
  store(eventEnvelopes: Array<NonPersistedEventEnvelope>, config: BoosterConfig): Promise<Array<EventEnvelope>>
  storeSnapshot(
    snapshotEnvelope: NonPersistedEntitySnapshotEnvelope,
    config: BoosterConfig
  ): Promise<EntitySnapshotEnvelope>
  storeDispatched(eventEnvelope: EventEnvelope, config: BoosterConfig): Promise<boolean>
  findDeletableEvent(
    config: BoosterConfig,
    parameters: EventDeleteParameters
  ): Promise<Array<EventEnvelopeFromDatabase>>
  findDeletableSnapshot(
    config: BoosterConfig,
    parameters: SnapshotDeleteParameters
  ): Promise<Array<EntitySnapshotEnvelopeFromDatabase>>
  deleteEvent(config: BoosterConfig, events: Array<EventEnvelopeFromDatabase>): Promise<void>
  deleteSnapshot(
    config: BoosterConfig,
    snapshots: Array<EntitySnapshotEnvelopeFromDatabase>
  ): Promise<void>
}
