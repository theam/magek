import {
  MagekConfig,
  ReadModelInterface,
  ReadModelStoreAdapter,
  ReadModelStoreEnvelope,
  UUID,
  FilterFor,
  SortFor,
  ProjectionFor,
  ReadModelListResult,
  SequenceKey,
  ReadOnlyNonEmptyArray,
  getLogger,
  OptimisticConcurrencyUnexpectedVersionError,
  ReadModelEnvelope,
} from '@magek/common'
import { MemoryReadModelRegistry, QueryFilter } from './memory-read-model-registry'

// Pre-built Memory Read Model Store Adapter instance
const readModelRegistry = new MemoryReadModelRegistry()

async function fetchReadModel(
  db: MemoryReadModelRegistry,
  config: MagekConfig,
  readModelName: string,
  readModelID: UUID,
  sequenceKey?: SequenceKey
): Promise<ReadOnlyNonEmptyArray<ReadModelInterface> | undefined> {
  const logger = getLogger(config, 'memory-read-model-adapter#fetchReadModel')

  const query: QueryFilter = { typeName: readModelName, 'value.id': readModelID }

  // If sequenceKey is provided, add it to the query
  if (sequenceKey) {
    query[`value.${sequenceKey.name}`] = sequenceKey.value
  }

  const response = await db.query(query)

  if (response.length === 0) {
    logger.debug(`Read model ${readModelName} with ID ${readModelID} not found`)
    return undefined
  }

  logger.debug(
    `Loaded read model ${readModelName} with ID ${readModelID} with result:`,
    response.map((item) => item.value)
  )
  return response.map((item) => item.value) as unknown as ReadOnlyNonEmptyArray<ReadModelInterface>
}

async function storeReadModel(
  db: MemoryReadModelRegistry,
  config: MagekConfig,
  readModelName: string,
  readModel: ReadModelInterface,
  expectedCurrentVersion: number
): Promise<void> {
  const logger = getLogger(config, 'memory-read-model-adapter#storeReadModel')
  logger.debug('Storing readModel ' + JSON.stringify(readModel))
  try {
    await db.store({ typeName: readModelName, value: readModel } as ReadModelEnvelope, expectedCurrentVersion)
  } catch (e) {
    if (e instanceof OptimisticConcurrencyUnexpectedVersionError) {
      logger.warn(
        `Unique violated storing ReadModel ${JSON.stringify(readModel)} and expectedCurrentVersion ${expectedCurrentVersion}`
      )
      throw e
    }
    throw e
  }
  logger.debug('Read model stored')
}

async function searchReadModel<TReadModel extends ReadModelInterface>(
  db: MemoryReadModelRegistry,
  config: MagekConfig,
  readModelName: string,
  filters: FilterFor<unknown>,
  sortBy?: SortFor<unknown>,
  limit?: number,
  afterCursor?: Record<string, string> | undefined,
  paginatedVersion = false,
  select?: ProjectionFor<TReadModel>
): Promise<Array<TReadModel> | ReadModelListResult<TReadModel>> {
  const logger = getLogger(config, 'memory-read-model-adapter#searchReadModel')
  logger.debug('Converting filter to query')

  const query: QueryFilter = { typeName: readModelName, filters }
  logger.debug('Got query ', query)

  const skipId = afterCursor?.id ? parseInt(afterCursor?.id) : 0
  const result = await db.query(query, sortBy, skipId, limit, select as ProjectionFor<unknown>)
  logger.debug('Search result: ', result)

  const items: Array<TReadModel> = result?.map((envelope) => envelope.value as TReadModel) ?? []

  if (paginatedVersion) {
    return {
      items: items,
      count: items?.length ?? 0,
      cursor: { id: ((limit ? limit : 1) + skipId).toString() },
    } as ReadModelListResult<TReadModel>
  }

  return items
}

async function deleteReadModel(
  db: MemoryReadModelRegistry,
  config: MagekConfig,
  readModelName: string,
  readModel: ReadModelInterface
): Promise<void> {
  const logger = getLogger(config, 'memory-read-model-adapter#deleteReadModel')
  logger.debug(`Entering to Read model deleted. ID=${readModel.id}.Name=${readModelName}`)
  try {
    await db.deleteById(readModel.id, readModelName)
    logger.debug(`Read model deleted. ${readModelName} ID = ${readModel.id}`)
  } catch (e) {
    logger.warn(`Read model to delete ${readModelName} ID = ${readModel.id} not found`)
  }
}

export const readModelStore: ReadModelStoreAdapter = {
  fetch: async <TReadModel extends ReadModelInterface>(
    config: MagekConfig,
    readModelName: string,
    readModelID: UUID,
    sequenceKey?: SequenceKey
  ): Promise<ReadOnlyNonEmptyArray<TReadModel> | undefined> => {
    const result = await fetchReadModel(readModelRegistry, config, readModelName, readModelID, sequenceKey)
    if (!result || result.length === 0) {
      return undefined
    }
    return result as ReadOnlyNonEmptyArray<TReadModel>
  },

  search: async <TReadModel extends ReadModelInterface>(
    config: MagekConfig,
    readModelName: string,
    filters: FilterFor<unknown>,
    sortBy?: SortFor<unknown>,
    limit?: number,
    afterCursor?: unknown,
    paginatedVersion?: boolean,
    select?: ProjectionFor<TReadModel>
  ): Promise<Array<TReadModel> | ReadModelListResult<TReadModel>> => {
    return await searchReadModel<TReadModel>(
      readModelRegistry,
      config,
      readModelName,
      filters,
      sortBy,
      limit,
      afterCursor as Record<string, string>,
      paginatedVersion ?? false,
      select
    )
  },

  store: async <TReadModel extends ReadModelInterface>(
    config: MagekConfig,
    readModelName: string,
    readModel: ReadModelStoreEnvelope<TReadModel>
  ): Promise<ReadModelStoreEnvelope<TReadModel>> => {
    const expectedCurrentVersion = (readModel.version ?? 1) - 1
    await storeReadModel(readModelRegistry, config, readModelName, readModel.value, expectedCurrentVersion)

    // Return the stored envelope with updated timestamps
    return {
      ...readModel,
      updatedAt: new Date().toISOString(),
    }
  },

  delete: async (config: MagekConfig, readModelName: string, readModelID: UUID): Promise<void> => {
    // Create a minimal ReadModelInterface for the delete operation
    const readModel: ReadModelInterface = {
      id: readModelID,
    }
    await deleteReadModel(readModelRegistry, config, readModelName, readModel)
  },

  rawToEnvelopes: async <TReadModel extends ReadModelInterface>(
    config: MagekConfig,
    rawReadModels: unknown
  ): Promise<Array<ReadModelStoreEnvelope<TReadModel>>> => {
    // This would typically convert raw database records to envelopes
    // For now, assume rawReadModels is already in the correct format
    return rawReadModels as Array<ReadModelStoreEnvelope<TReadModel>>
  },

  healthCheck: {
    isUp: async (): Promise<boolean> => true,
    details: async (): Promise<unknown> => {
      return {
        type: 'memory',
        count: readModelRegistry.getCount(),
      }
    },
    urls: async (): Promise<Array<string>> => ['memory://in-memory-read-model-store'],
  },
}

// Export individual components for backward compatibility and testing
export { MemoryReadModelRegistry } from './memory-read-model-registry'
export { evaluateFilter, convertFilter } from './library/filter-evaluator'
export { fetchReadModel, storeReadModel, searchReadModel, deleteReadModel }
