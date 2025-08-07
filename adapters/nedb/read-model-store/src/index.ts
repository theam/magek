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
} from '@magek/common'
import { ReadModelRegistry } from './read-model-registry'
import { deleteReadModel, fetchReadModel, searchReadModel, storeReadModel } from './library/read-model-adapter'
import { readModelsDatabase } from './paths'
import { existsSync } from 'fs'

// Pre-built NeDB Read Model Store Adapter instance
const readModelRegistry = new ReadModelRegistry()

async function countAll(database: any): Promise<number> {
  await database.loadDatabaseIfNeeded()
  const count = await database.readModels.countAsync({})
  return count ?? 0
}

export const readModelStore: ReadModelStoreAdapter = {
  fetch: async <TReadModel extends ReadModelInterface>(
    config: MagekConfig,
    readModelName: string,
    readModelID: UUID
  ): Promise<ReadModelStoreEnvelope<TReadModel> | undefined> => {
    const result = await fetchReadModel(readModelRegistry, config, readModelName, readModelID)
    const readModel = result[0]
    if (!readModel) {
      return undefined
    }
    
    // Convert ReadModelInterface to ReadModelStoreEnvelope
    return {
      typeName: readModelName,
      value: readModel,
      id: readModel.id,
      version: readModel.magekMetadata?.version ?? 1,
      createdAt: readModel.magekMetadata?.lastUpdateAt ?? new Date().toISOString(),
      updatedAt: readModel.magekMetadata?.lastUpdateAt ?? new Date().toISOString(),
    } as ReadModelStoreEnvelope<TReadModel>
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
    // Use existing searchReadModel function which already returns the expected format
    const result = await searchReadModel(
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
    
    // The searchReadModel function already returns Array<TReadModel> or ReadModelListResult<TReadModel>
    return result as Array<TReadModel> | ReadModelListResult<TReadModel>
  },

  store: async <TReadModel extends ReadModelInterface>(
    config: MagekConfig,
    readModelName: string,
    readModel: ReadModelStoreEnvelope<TReadModel>
  ): Promise<ReadModelStoreEnvelope<TReadModel>> => {
    const expectedCurrentVersion = (readModel.version ?? 1) - 1
    await storeReadModel(
      readModelRegistry,
      config,
      readModelName,
      readModel.value,
      expectedCurrentVersion
    )
    
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

  rawToEnvelopes: <TReadModel extends ReadModelInterface>(rawReadModels: unknown): Array<ReadModelStoreEnvelope<TReadModel>> => {
    // This would typically convert raw database records to envelopes
    // For now, assume rawReadModels is already in the correct format
    return rawReadModels as Array<ReadModelStoreEnvelope<TReadModel>>
  },

  healthCheck: {
    isUp: async (): Promise<boolean> => existsSync(readModelsDatabase),
    details: async (): Promise<unknown> => {
      const count = await countAll(readModelRegistry)
      return {
        file: readModelsDatabase,
        count: count,
      }
    },
    urls: async (): Promise<Array<string>> => [readModelsDatabase],
  },
}

// Export individual components for backward compatibility
export { ReadModelRegistry } from './read-model-registry'
export { 
  fetchReadModel,
  storeReadModel,
  searchReadModel,
  deleteReadModel,
} from './library/read-model-adapter'
export { queryRecordFor } from './library/searcher-adapter'