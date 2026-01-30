import {
  UUID,
  UserApp,
  MagekConfig,
  NonPersistedEventEnvelope,
  NonPersistedEntitySnapshotEnvelope,
  EventSearchParameters,
  EventDeleteParameters,
  EventEnvelopeFromDatabase,
  SnapshotDeleteParameters,
  EntitySnapshotEnvelopeFromDatabase,
  EventStoreAdapter,
  EventEnvelope,
  EntitySnapshotEnvelope,
  EventSearchResponse,
  PaginatedEntitiesIdsResult,
  getLogger,
  unique,
  retryIfError,
  OptimisticConcurrencyUnexpectedVersionError,
  EventParametersFilterByEntity,
  EventParametersFilterByType,
} from '@magek/common'
import { MemoryEventRegistry, QueryFilter } from './memory-event-registry'
import * as path from 'path'

// Pre-built Memory Event Store Adapter instance
const eventRegistry = new MemoryEventRegistry()

const originOfTime = new Date(0).toISOString()

function notImplemented(): any {
  throw new Error('Not implemented for Memory adapter')
}

// Function to get userApp from config or load it from standard location
function getUserApp(config: MagekConfig): UserApp {
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

export function rawEventsToEnvelopes(rawEvents: Array<unknown>): Array<EventEnvelope> {
  return rawEvents.map((event) => event as EventEnvelope)
}

async function readEntityEventsSince(
  registry: MemoryEventRegistry,
  config: MagekConfig,
  entityTypeName: string,
  entityID: UUID,
  since?: string
): Promise<Array<EventEnvelope>> {
  const logger = getLogger(config, 'memory-events-adapter#readEntityEventsSince')
  const fromTime = since ? since : originOfTime

  const query: QueryFilter = {
    entityID: entityID,
    entityTypeName: entityTypeName,
    kind: 'event',
    createdAt: {
      $gt: fromTime,
    },
    deletedAt: { $exists: false },
  }
  const result = await registry.query(query)

  logger.debug(`Loaded events for entity ${entityTypeName} with ID ${entityID} with result:`, result)
  return result as Array<EventEnvelope>
}

async function readEntityLatestSnapshot(
  registry: MemoryEventRegistry,
  config: MagekConfig,
  entityTypeName: string,
  entityID: UUID
): Promise<EntitySnapshotEnvelope | undefined> {
  const logger = getLogger(config, 'memory-events-adapter#readEntityLatestSnapshot')
  const query: QueryFilter = {
    entityID: entityID,
    entityTypeName: entityTypeName,
    kind: 'snapshot',
  }

  const snapshot = await registry.queryLatestSnapshot(query)

  if (snapshot) {
    logger.debug(`Snapshot found for entity ${entityTypeName} with ID ${entityID}:`, snapshot)
    return snapshot as EntitySnapshotEnvelope
  } else {
    logger.debug(`No snapshot found for entity ${entityTypeName} with ID ${entityID}.`)
    return undefined
  }
}

async function storeEvents(
  userApp: UserApp,
  registry: MemoryEventRegistry,
  nonPersistedEventEnvelopes: Array<NonPersistedEventEnvelope>,
  config: MagekConfig
): Promise<Array<EventEnvelope>> {
  const logger = getLogger(config, 'memory-events-adapter#storeEvents')
  logger.debug('Storing the following event envelopes:', nonPersistedEventEnvelopes)
  const persistedEventEnvelopes: Array<EventEnvelope> = []
  for (const nonPersistedEventEnvelope of nonPersistedEventEnvelopes) {
    const persistableEventEnvelope: EventEnvelope = {
      ...nonPersistedEventEnvelope,
      createdAt: new Date().toISOString(),
    }
    await retryIfError(
      async () => await registry.store(persistableEventEnvelope),
      OptimisticConcurrencyUnexpectedVersionError
    )
    persistedEventEnvelopes.push(persistableEventEnvelope)
  }
  logger.debug('EventEnvelopes stored: ', persistedEventEnvelopes)

  await userApp.eventDispatcher(persistedEventEnvelopes)
  return persistedEventEnvelopes
}

async function storeSnapshot(
  registry: MemoryEventRegistry,
  snapshotEnvelope: NonPersistedEntitySnapshotEnvelope,
  config: MagekConfig
): Promise<EntitySnapshotEnvelope> {
  const logger = getLogger(config, 'memory-events-adapter#storeSnapshot')
  logger.debug('Storing the following snapshot envelope:', snapshotEnvelope)
  const persistableEntitySnapshot: EntitySnapshotEnvelope = {
    ...snapshotEnvelope,
    createdAt: snapshotEnvelope.snapshottedEventCreatedAt,
    persistedAt: new Date().toISOString(),
  }
  await retryIfError(
    () => registry.store(persistableEntitySnapshot),
    OptimisticConcurrencyUnexpectedVersionError
  )
  logger.debug('Snapshot stored')
  return persistableEntitySnapshot
}

async function storeDispatchedEvent(registry: MemoryEventRegistry, eventEnvelope: EventEnvelope): Promise<boolean> {
  const eventId = eventEnvelope.id || `${eventEnvelope.entityTypeName}:${eventEnvelope.entityID}:${eventEnvelope.createdAt}`
  return registry.storeDispatched(eventId)
}

function buildFiltersForByTime(fromValue?: string, toValue?: string): { createdAt?: any } {
  if (fromValue && toValue) {
    return {
      createdAt: { $gte: fromValue, $lte: toValue },
    }
  } else if (fromValue) {
    return {
      createdAt: { $gte: fromValue },
    }
  } else if (toValue) {
    return {
      createdAt: { $lte: toValue },
    }
  }
  return {}
}

function buildFiltersForByFilters(
  filters: EventParametersFilterByEntity | EventParametersFilterByType
): QueryFilter {
  if ('entity' in filters) {
    if (filters.entityID) {
      return {
        entityTypeName: filters.entity,
        entityID: filters.entityID,
      }
    }
    return {
      entityTypeName: filters.entity,
    }
  } else if ('type' in filters) {
    return {
      typeName: filters.type,
    }
  } else {
    throw new Error('Invalid search event query. It is neither an search by "entity" nor a search by "type"')
  }
}

function resultToEventSearchResponse(result: Array<EventEnvelope> | null): Array<EventSearchResponse> {
  if (!result || result.length === 0) return []
  const eventSearchResult = result.map((item) => {
    return {
      type: item.typeName,
      entity: item.entityTypeName,
      entityID: item.entityID,
      requestID: item.requestID,
      user: item.currentUser,
      createdAt: item.createdAt,
      value: item.value,
      deletedAt: item.deletedAt,
    } as EventSearchResponse
  })
  return eventSearchResult ?? []
}

async function searchEvents(
  registry: MemoryEventRegistry,
  config: MagekConfig,
  parameters: EventSearchParameters
): Promise<Array<EventSearchResponse>> {
  const logger = getLogger(config, 'memory-events-adapter#searchEvents')
  logger.debug('Initiating an events search. Filters: ', parameters)
  const timeFilterQuery = buildFiltersForByTime(parameters.from, parameters.to)
  const eventFilterQuery = buildFiltersForByFilters(parameters)
  const filterQuery: QueryFilter = { ...eventFilterQuery, ...timeFilterQuery, kind: 'event' }
  const result = (await registry.query(filterQuery, 'desc', parameters.limit)) as Array<EventEnvelope>
  const eventsSearchResponses = resultToEventSearchResponse(result)
  logger.debug('Events search result: ', eventsSearchResponses)
  return eventsSearchResponses
}

async function searchEntitiesIds(
  registry: MemoryEventRegistry,
  config: MagekConfig,
  limit: number,
  afterCursor: Record<string, string> | undefined,
  entityTypeName: string
): Promise<PaginatedEntitiesIdsResult> {
  const logger = getLogger(config, 'memory-events-adapter#searchEntitiesIds')
  logger.debug(
    `Initiating a paginated events search. limit: ${limit}, afterCursor: ${JSON.stringify(
      afterCursor
    )}, entityTypeName: ${entityTypeName}`
  )
  const filterQuery: QueryFilter = {
    kind: 'event',
    entityTypeName: entityTypeName,
    deletedAt: { $exists: false },
  }

  const result = (await registry.query(filterQuery, 'desc')) as Array<EventEnvelope>

  const entitiesIds = result ? result?.map((v) => v.entityID) : []
  const uniqueResult = unique(entitiesIds)
  const skipId = afterCursor?.id ? parseInt(afterCursor?.id) : 0
  const paginated = uniqueResult.slice(skipId, skipId + limit)
  const paginatedResult = paginated.map((v) => ({ entityID: v }))
  logger.debug('Unique events search result', paginatedResult)
  return {
    items: paginatedResult,
    count: paginatedResult?.length ?? 0,
    cursor: { id: ((limit ? limit : 1) + skipId).toString() },
  } as PaginatedEntitiesIdsResult
}

type DatabaseEventEnvelopeWithId = EventEnvelope & { id: string }
type DatabaseEntitySnapshotEnvelopeWithId = EntitySnapshotEnvelope & { id: string }

async function findDeletableEvent(
  registry: MemoryEventRegistry,
  config: MagekConfig,
  parameters: EventDeleteParameters
): Promise<Array<EventEnvelopeFromDatabase>> {
  const logger = getLogger(config, 'memory-events-adapter#findDeletableEvent')
  const stringifyParameters = JSON.stringify(parameters)
  logger.debug(`Initiating a deletable event search for ${stringifyParameters}`)

  const filter: QueryFilter = {
    entityTypeName: parameters.entityTypeName,
    entityID: parameters.entityID,
    createdAt: parameters.createdAt,
    kind: 'event',
    deletedAt: { $exists: false },
  }
  const events = (await registry.query(filter)) as Array<DatabaseEventEnvelopeWithId>
  const result = events.map((event) => {
    return {
      ...event,
      id: event.id,
    }
  }) as Array<EventEnvelopeFromDatabase>
  logger.debug(`Finished deletable event search for ${stringifyParameters}`)
  return result
}

async function findDeletableSnapshot(
  registry: MemoryEventRegistry,
  config: MagekConfig,
  parameters: SnapshotDeleteParameters
): Promise<Array<EntitySnapshotEnvelopeFromDatabase>> {
  const logger = getLogger(config, 'memory-events-adapter#findDeletableSnapshot')
  const stringifyParameters = JSON.stringify(parameters)
  logger.debug(`Initiating a deletable snapshot search for ${stringifyParameters}`)

  const filter: QueryFilter = {
    entityTypeName: parameters.entityTypeName,
    entityID: parameters.entityID,
    createdAt: parameters.createdAt,
    kind: 'snapshot',
    deletedAt: { $exists: false },
  }
  const snapshots = (await registry.query(filter)) as Array<DatabaseEntitySnapshotEnvelopeWithId>
  const result: Array<EntitySnapshotEnvelopeFromDatabase> = snapshots.map((snapshot) => {
    return {
      ...snapshot,
      id: snapshot.id,
    }
  })
  logger.debug(`Finished deletable snapshot search for ${stringifyParameters}`)
  return result
}

function buildNewEvent(existingEvent: EventEnvelopeFromDatabase): EventEnvelope {
  return {
    ...existingEvent,
    deletedAt: new Date().toISOString(),
    value: {},
  }
}

async function deleteEvent(
  registry: MemoryEventRegistry,
  config: MagekConfig,
  events: Array<EventEnvelopeFromDatabase>
): Promise<void> {
  const logger = getLogger(config, 'memory-events-adapter#deleteEvent')
  const stringifyParameters = JSON.stringify(events)
  logger.debug(`Initiating an event delete for ${stringifyParameters}`)

  if (!events || events.length === 0) {
    logger.warn('Could not find events to delete')
    return
  }
  for (const event of events) {
    const newEvent = buildNewEvent(event)
    await registry.replaceOrDeleteItem(event.id, newEvent)
  }
  logger.debug(`Finished event delete for ${stringifyParameters}`)
}

async function deleteSnapshot(
  registry: MemoryEventRegistry,
  config: MagekConfig,
  snapshots: Array<EntitySnapshotEnvelopeFromDatabase>
): Promise<void> {
  const logger = getLogger(config, 'memory-events-adapter#deleteSnapshot')
  const stringifyParameters = JSON.stringify(snapshots)
  logger.debug(`Initiating a snapshot delete for ${stringifyParameters}`)

  if (!snapshots || snapshots.length === 0) {
    logger.warn('Could not find snapshot to delete')
    return
  }
  for (const snapshot of snapshots) {
    await registry.replaceOrDeleteItem(snapshot.id)
  }
  logger.debug(`Finished snapshot delete for ${stringifyParameters}`)
}

export const eventStore: EventStoreAdapter = {
  rawToEnvelopes: rawEventsToEnvelopes,
  rawStreamToEnvelopes: notImplemented,
  dedupEventStream: notImplemented,
  produce: notImplemented,
  forEntitySince: (config: MagekConfig, entityTypeName: string, entityID: UUID, since?: string) =>
    readEntityEventsSince(eventRegistry, config, entityTypeName, entityID, since),
  latestEntitySnapshot: (config: MagekConfig, entityTypeName: string, entityID: UUID) =>
    readEntityLatestSnapshot(eventRegistry, config, entityTypeName, entityID),
  store: (eventEnvelopes: Array<NonPersistedEventEnvelope>, config: MagekConfig) => {
    const userApp = getUserApp(config)
    return storeEvents(userApp, eventRegistry, eventEnvelopes, config)
  },
  storeSnapshot: (snapshotEnvelope: NonPersistedEntitySnapshotEnvelope, config: MagekConfig) =>
    storeSnapshot(eventRegistry, snapshotEnvelope, config),
  search: (config: MagekConfig, parameters: EventSearchParameters) =>
    searchEvents(eventRegistry, config, parameters),
  searchEntitiesIDs: (
    config: MagekConfig,
    limit: number,
    afterCursor: Record<string, string> | undefined,
    entityTypeName: string
  ) => searchEntitiesIds(eventRegistry, config, limit, afterCursor, entityTypeName),
  storeDispatched: (eventEnvelope: EventEnvelope, config: MagekConfig) =>
    storeDispatchedEvent(eventRegistry, eventEnvelope),
  findDeletableEvent: (config: MagekConfig, parameters: EventDeleteParameters) =>
    findDeletableEvent(eventRegistry, config, parameters),
  findDeletableSnapshot: (config: MagekConfig, parameters: SnapshotDeleteParameters) =>
    findDeletableSnapshot(eventRegistry, config, parameters),
  deleteEvent: (config: MagekConfig, events: Array<EventEnvelopeFromDatabase>) =>
    deleteEvent(eventRegistry, config, events),
  deleteSnapshot: (config: MagekConfig, snapshots: Array<EntitySnapshotEnvelopeFromDatabase>) =>
    deleteSnapshot(eventRegistry, config, snapshots),
  healthCheck: {
    isUp: async () => true,
    details: async () => {
      return {
        type: 'memory',
        eventsCount: eventRegistry.getEventsCount(),
        snapshotsCount: eventRegistry.getSnapshotsCount(),
      }
    },
    urls: async () => ['memory://in-memory-event-store'],
  },
}

// Export components for testing
export { MemoryEventRegistry } from './memory-event-registry'
