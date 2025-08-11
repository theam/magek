import {
  MagekConfig,
  FilterFor,
  OptimisticConcurrencyUnexpectedVersionError,
  ProjectionFor,
  ReadModelEnvelope,
  ReadModelInterface,
  ReadModelListResult,
  ReadOnlyNonEmptyArray,
  SequenceKey,
  SortFor,
  UUID,
  getLogger,
} from '@magek/common'
import { NedbError, ReadModelRegistry, UNIQUE_VIOLATED_ERROR_TYPE } from '../read-model-registry'
import { queryRecordFor } from './searcher-adapter'

export async function rawReadModelEventsToEnvelopes(
  config: MagekConfig,
  rawEvents: Array<unknown>
): Promise<Array<ReadModelEnvelope>> {
  return rawEvents as Array<ReadModelEnvelope>
}

export async function fetchReadModel(
  db: ReadModelRegistry,
  config: MagekConfig,
  readModelName: string,
  readModelID: UUID,
  sequenceKey?: SequenceKey
): Promise<ReadOnlyNonEmptyArray<ReadModelInterface> | undefined> {
  const logger = getLogger(config, 'read-model-adapter#fetchReadModel')
  
  let query: any = { typeName: readModelName, 'value.id': readModelID }
  
  // If sequenceKey is provided, add it to the query
  if (sequenceKey) {
    query[`value.${sequenceKey.name}`] = sequenceKey.value
  }
  
  const response = await db.query(query)
  
  if (response.length === 0) {
    logger.debug(`Read model ${readModelName} with ID ${readModelID} not found`)
    return undefined
  } 
  
  logger.debug(`Loaded read model ${readModelName} with ID ${readModelID} with result:`, response.map(item => item.value))
  return response.map(item => item.value) as unknown as ReadOnlyNonEmptyArray<ReadModelInterface>
}

export async function storeReadModel(
  db: ReadModelRegistry,
  config: MagekConfig,
  readModelName: string,
  readModel: ReadModelInterface,
  expectedCurrentVersion: number
): Promise<void> {
  const logger = getLogger(config, 'read-model-adapter#storeReadModel')
  logger.debug('Storing readModel ' + JSON.stringify(readModel))
  try {
    await db.store({ typeName: readModelName, value: readModel } as ReadModelEnvelope, expectedCurrentVersion)
  } catch (e) {
    const error = e as NedbError
    // The error will be thrown, but in case of a conditional check, we throw the expected error type by the core
    if (error.errorType == UNIQUE_VIOLATED_ERROR_TYPE) {
      logger.warn(
        `Unique violated storing ReadModel ${JSON.stringify(
          readModel
        )} and expectedCurrentVersion ${expectedCurrentVersion}`
      )
      throw new OptimisticConcurrencyUnexpectedVersionError(error.message)
    }
    throw e
  }
  logger.debug('Read model stored')
}

export async function searchReadModel<TReadModel extends ReadModelInterface>(
  db: ReadModelRegistry,
  config: MagekConfig,
  readModelName: string,
  filters: FilterFor<unknown>,
  sortBy?: SortFor<unknown>,
  limit?: number,
  afterCursor?: Record<string, string> | undefined,
  paginatedVersion = false,
  select?: ProjectionFor<TReadModel>
   
): Promise<Array<TReadModel> | ReadModelListResult<TReadModel>> {
  const logger = getLogger(config, 'read-model-adapter#searchReadModel')
  logger.debug('Converting filter to query')
  const queryFor = queryRecordFor(filters)
  const query = { ...queryFor, typeName: readModelName }
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

export async function deleteReadModel(
  db: ReadModelRegistry,
  config: MagekConfig,
  readModelName: string,
  readModel: ReadModelInterface
): Promise<void> {
  const logger = getLogger(config, 'read-model-adapter#deleteReadModel')
  logger.debug(`Entering to Read model deleted. ID=${readModel.id}.Name=${readModelName}`)
  try {
    await db.deleteById(readModel.id, readModelName)
    logger.debug(`Read model deleted. ${readModelName} ID = ${readModel.id}`)
  } catch (e) {
    logger.warn(`Read model to delete ${readModelName} ID = ${readModel.id} not found`)
  }
}