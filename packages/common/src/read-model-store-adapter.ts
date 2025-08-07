import { UUID } from './concepts'
import { MagekConfig } from './config'
import { ReadModelInterface } from './concepts'
import { FilterFor, ProjectionFor, SortFor } from './searcher'
import { ReadModelListResult } from './envelope'

export interface ReadModelStoreEnvelope<T = ReadModelInterface> {
  typeName: string
  value: T
  id: UUID
  version: number
  createdAt: string
  updatedAt: string
}

export interface ReadModelStoreAdapter {
  /**
   * Fetches a single read model by its ID
   *
   * @param config - The Magek configuration object
   * @param readModelName - The name of the read model type
   * @param readModelID - The ID of the read model to fetch
   * @returns A promise that resolves to the read model envelope, or undefined if not found
   */
  fetch<TReadModel extends ReadModelInterface>(
    config: MagekConfig,
    readModelName: string,
    readModelID: UUID
  ): Promise<ReadModelStoreEnvelope<TReadModel> | undefined>

  /**
   * Searches for read models based on specific parameters
   * This method signature matches the original provider library interface
   *
   * @param config - The Magek configuration object
   * @param readModelName - The name of the read model type
   * @param filters - The filters to be applied during the search
   * @param sortBy - An object that specifies how the results should be sorted (optional)
   * @param limit - The maximum number of results to return (optional)
   * @param afterCursor - A cursor that specifies the position after which results should be returned (optional)
   * @param paginatedVersion - A boolean value that indicates whether the results should be paginated (optional)
   * @param select - An object that specifies fields to be returned, including calculated field dependencies (optional)
   * @returns A promise that resolves to an array of read models or a ReadModelListResult
   */
  search<TReadModel extends ReadModelInterface>(
    config: MagekConfig,
    readModelName: string,
    filters: FilterFor<unknown>,
    sortBy?: SortFor<unknown>,
    limit?: number,
    afterCursor?: unknown,
    paginatedVersion?: boolean,
    select?: ProjectionFor<TReadModel>
  ): Promise<Array<TReadModel> | ReadModelListResult<TReadModel>>

  /**
   * Stores or updates a read model
   *
   * @param config - The Magek configuration object
   * @param readModelName - The name of the read model type
   * @param readModel - The read model envelope to store
   * @returns A promise that resolves to the stored read model envelope
   */
  store<TReadModel extends ReadModelInterface>(
    config: MagekConfig,
    readModelName: string,
    readModel: ReadModelStoreEnvelope<TReadModel>
  ): Promise<ReadModelStoreEnvelope<TReadModel>>

  /**
   * Deletes a read model by its ID
   *
   * @param config - The Magek configuration object
   * @param readModelName - The name of the read model type
   * @param readModelID - The ID of the read model to delete
   * @returns A promise that resolves when the read model has been deleted
   */
  delete(config: MagekConfig, readModelName: string, readModelID: UUID): Promise<void>

  /**
   * Converts raw read model data into ReadModelStoreEnvelope objects
   *
   * @param rawReadModels - The raw read model data to be converted
   * @returns An array of ReadModelStoreEnvelope objects
   */
  rawToEnvelopes<TReadModel extends ReadModelInterface>(rawReadModels: unknown): Array<ReadModelStoreEnvelope<TReadModel>>

  /**
   * Health check methods for the read model store
   */
  healthCheck?: {
    /**
     * Check if the read model store is up and running
     */
    isUp(config: MagekConfig): Promise<boolean>
    
    /**
     * Get detailed health information about the read model store
     */
    details(config: MagekConfig): Promise<unknown>
    
    /**
     * Get the URLs/endpoints of the read model store
     */
    urls(config: MagekConfig): Promise<Array<string>>
  }
}