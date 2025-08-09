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
    readModelID: UUID,
    sequenceKey?: SequenceKey
  ): Promise<ReadModelStoreEnvelope<TReadModel> | ReadOnlyNonEmptyArray<ReadModelStoreEnvelope<TReadModel>> | undefined> => {
    const result = await fetchReadModel(readModelRegistry, config, readModelName, readModelID, sequenceKey)
    if (!result || result.length === 0) {
      return undefined
    }
    
    // Convert ReadModelInterface to ReadModelStoreEnvelope
    const envelopes = result.map(readModel => ({
      typeName: readModelName,
      value: readModel,
      id: readModel.id,
      version: readModel.magekMetadata?.version ?? 1,
      createdAt: readModel.magekMetadata?.lastUpdateAt ?? new Date().toISOString(),
      updatedAt: readModel.magekMetadata?.lastUpdateAt ?? new Date().toISOString(),
    })) as Array<ReadModelStoreEnvelope<TReadModel>>
    
    if (sequenceKey || result.length > 1) {
      return envelopes as ReadOnlyNonEmptyArray<ReadModelStoreEnvelope<TReadModel>>
    }
    
    return envelopes[0]
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

  rawToEnvelopes: async <TReadModel extends ReadModelInterface>(config: MagekConfig, rawReadModels: unknown): Promise<Array<ReadModelStoreEnvelope<TReadModel>>> => {
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