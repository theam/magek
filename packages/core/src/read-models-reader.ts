 
import {
  AnyClass,
  MagekConfig,
  FilterFor,
  GraphQLOperation,
  InvalidParameterError,
  NotFoundError,
  ProjectionFor,
  ReadModelInterface,
  ReadModelListResult,
  ReadModelMetadata,
  ReadModelRequestEnvelope,
  ReadOnlyNonEmptyArray,
  SequenceKey,
  SortFor,
  SubscriptionEnvelope,
  TraceActionTypes,
  UUID,
  createInstance,
  createInstances,
  createInstanceWithCalculatedProperties,
  getLogger,
  PropertyMetadata,
} from '@magek/common'
import { Magek } from './magek'
import { applyReadModelRequestBeforeFunctions } from './services/filter-helpers'
import { ReadModelSchemaMigrator } from './read-model-schema-migrator'
import { trace } from './instrumentation'


export class MagekReadModelsReader {
  public constructor(readonly config: MagekConfig) {}

  @trace(TraceActionTypes.READ_MODEL_FIND_BY_ID)
  public async findById(
    readModelRequest: ReadModelRequestEnvelope<ReadModelInterface>
  ): Promise<ReadModelInterface | ReadOnlyNonEmptyArray<ReadModelInterface>> {
    await this.validateByIdRequest(readModelRequest)

    const readModelMetadata = this.config.readModels[readModelRequest.class.name]
    const readModelTransformedRequest = await applyReadModelRequestBeforeFunctions(
      readModelRequest,
      readModelMetadata.before,
      readModelRequest.currentUser
    )

    const key = readModelTransformedRequest.key
    if (!key) {
      throw 'Tried to run a findById operation without providing a key. An ID is required to perform this operation.'
    }
    const currentReadModel = await Magek.readModel(readModelMetadata.class).findById(key.id, key.sequenceKey)
    if (currentReadModel) {
      const readModelInstance = createInstance(readModelMetadata.class, currentReadModel)
      const readModelName = readModelMetadata.class.name
      const readModelSchemaMigrator = new ReadModelSchemaMigrator(this.config)
      if (Array.isArray(readModelInstance)) {
        return [await readModelSchemaMigrator.migrate(<ReadModelInterface>readModelInstance[0], readModelName)]
      }
      return readModelSchemaMigrator.migrate(<ReadModelInterface>readModelInstance, readModelName)
    }
    return currentReadModel
  }

  @trace(TraceActionTypes.GRAPHQL_READ_MODEL_SEARCH)
  public async search(
    readModelRequest: ReadModelRequestEnvelope<ReadModelInterface>
  ): Promise<Array<ReadModelInterface> | ReadModelListResult<ReadModelInterface>> {
    await this.validateRequest(readModelRequest)

    const readModelMetadata = this.config.readModels[readModelRequest.class.name]
    const readModelTransformedRequest = await applyReadModelRequestBeforeFunctions(
      readModelRequest,
      readModelMetadata.before,
      readModelRequest.currentUser
    )
    return await this.readModelSearch(
      readModelMetadata.class,
      readModelTransformedRequest.filters,
      readModelTransformedRequest.sortBy,
      readModelTransformedRequest.limit,
      readModelTransformedRequest.afterCursor,
      readModelTransformedRequest.paginatedVersion,
      readModelTransformedRequest.select
    )
  }

  @trace(TraceActionTypes.READ_MODEL_SEARCH)
  public async readModelSearch<TReadModel extends ReadModelInterface>(
    readModelClass: AnyClass,
    filters: FilterFor<unknown>,
    sort?: SortFor<unknown>,
    limit?: number,
    afterCursor?: any,
    paginatedVersion?: boolean,
    select?: ProjectionFor<TReadModel>
  ): Promise<Array<TReadModel> | ReadModelListResult<TReadModel>> {
    const readModelName = readModelClass.name

    let selectWithDependencies: ProjectionFor<TReadModel> | undefined = undefined
    const calculatedFieldsDependencies = this.getCalculatedFieldsDependencies(readModelClass)

    if (select && Object.keys(calculatedFieldsDependencies).length > 0) {
      const extendedSelect = new Set<string>(select)

      select.forEach((field: any) => {
        const topLevelField = field.split('.')[0].replace('[]', '')
        if (calculatedFieldsDependencies[topLevelField]) {
          calculatedFieldsDependencies[topLevelField].map((dependency) => extendedSelect.add(dependency))
        }
      })

      selectWithDependencies = Array.from(extendedSelect) as ProjectionFor<TReadModel>
    }

    const searchResult = await this.config.readModelStore.search<TReadModel>(
      this.config,
      readModelName,
      filters ?? {},
      sort ?? {},
      limit,
      afterCursor,
      paginatedVersion ?? false,
      selectWithDependencies ?? select
    )

    const readModels = this.createReadModelInstances(searchResult, readModelClass)
    if (select) {
      return this.createReadModelInstancesWithCalculatedProperties(searchResult, readModelClass, select ?? [])
    }
    return this.migrateReadModels(readModels, readModelName)
  }

  public async finderByIdFunction<TReadModel extends ReadModelInterface>(
    readModelClass: AnyClass,
    id: UUID,
    sequenceKey?: SequenceKey
  ): Promise<ReadOnlyNonEmptyArray<TReadModel> | TReadModel> {
    const result = await this.config.readModelStore.fetch<TReadModel>(this.config, readModelClass.name, id, sequenceKey)
    if (!result) {
      throw new Error(`Read model not found: ${readModelClass.name} with id ${id}`)
    }
    
    // The adapter returns ReadOnlyNonEmptyArray<TReadModel> | undefined
    // For backward compatibility, we return a single item if sequenceKey is not provided
    return sequenceKey ? result : result[0]
  }

  private async migrateReadModels<TReadModel extends ReadModelInterface>(
    readModels: Array<TReadModel> | ReadModelListResult<TReadModel>,
    readModelName: string
  ): Promise<Array<TReadModel> | ReadModelListResult<TReadModel>> {
    const readModelSchemaMigrator = new ReadModelSchemaMigrator(this.config)
    if (Array.isArray(readModels)) {
      return Promise.all(readModels.map((readModel) => readModelSchemaMigrator.migrate(readModel, readModelName)))
    }
    readModels.items = await Promise.all(
      readModels.items.map((readModel) => readModelSchemaMigrator.migrate(readModel, readModelName))
    )
    return readModels
  }

  private createReadModelInstances<TReadModel extends ReadModelInterface>(
    searchResult: Array<TReadModel> | ReadModelListResult<TReadModel>,
    readModelClass: AnyClass
  ): Array<TReadModel> | ReadModelListResult<TReadModel> {
    if (Array.isArray(searchResult)) {
      return createInstances(readModelClass, searchResult)
    }
    return {
      ...searchResult,
      items: createInstances(readModelClass, searchResult.items),
    }
  }

  /**
   * Creates instances of the read model class with the calculated properties included
   * @param searchResult The search result
   * @param readModelClass The read model class
   * @param propertiesToInclude The properties to include in the response
   * @private
   */
  private async createReadModelInstancesWithCalculatedProperties<TReadModel extends ReadModelInterface>(
    searchResult: Array<TReadModel> | ReadModelListResult<TReadModel>,
    readModelClass: AnyClass,
    propertiesToInclude: ProjectionFor<TReadModel>
  ): Promise<Array<TReadModel> | ReadModelListResult<TReadModel>> {
    const processInstance = async (raw: Partial<TReadModel>): Promise<TReadModel> => {
      const instance = await createInstanceWithCalculatedProperties(readModelClass, raw, propertiesToInclude)
      return instance as TReadModel
    }

    if (Array.isArray(searchResult)) {
      return await Promise.all(searchResult.map(processInstance))
    } else {
      const processedItems = await Promise.all(searchResult.items.map(processInstance))
      return {
        ...searchResult,
        items: processedItems,
      }
    }
  }

  public async subscribe(
    connectionID: string,
    readModelRequest: ReadModelRequestEnvelope<ReadModelInterface>,
    operation: GraphQLOperation
  ): Promise<unknown> {
    await this.validateRequest(readModelRequest)
    return this.processSubscription(connectionID, readModelRequest, operation)
  }

  public async unsubscribe(connectionID: string, subscriptionID: string): Promise<void> {
    return this.config.sessionStore.deleteSubscription(this.config, connectionID, subscriptionID)
  }

  public async unsubscribeAll(connectionID: string): Promise<void> {
    return this.config.sessionStore.deleteSubscriptionsForConnection(this.config, connectionID)
  }

  private async validateByIdRequest(readModelByIdRequest: ReadModelRequestEnvelope<ReadModelInterface>): Promise<void> {
    const logger = getLogger(this.config, 'MagekReadModelsReader#validateByIdRequest')
    logger.debug('Validating the following read model by id request: ', readModelByIdRequest)
    if (!readModelByIdRequest.version) {
      throw new InvalidParameterError('The required request "version" was not present')
    }

    const readModelMetadata = this.config.readModels[readModelByIdRequest.class.name]
    if (!readModelMetadata) {
      throw new NotFoundError(`Could not find read model ${readModelByIdRequest.class.name}`)
    }

    await readModelMetadata.authorizer(readModelByIdRequest.currentUser, readModelByIdRequest)

    if (
      readModelByIdRequest?.key?.sequenceKey &&
      readModelByIdRequest.key.sequenceKey.name !== this.config.readModelSequenceKeys[readModelByIdRequest.class.name]
    ) {
      throw new InvalidParameterError(
        `Could not find a sort key defined for ${readModelByIdRequest.class.name} named '${readModelByIdRequest.key.sequenceKey.name}'.`
      )
    }
  }

  private async validateRequest(readModelRequest: ReadModelRequestEnvelope<ReadModelInterface>): Promise<void> {
    const logger = getLogger(this.config, 'MagekReadModelsReader#validateRequest')
    logger.debug('Validating the following read model request: ', readModelRequest)
    if (!readModelRequest.version) {
      throw new InvalidParameterError('The required request "version" was not present')
    }

    const readModelMetadata = this.config.readModels[readModelRequest.class.name]
    if (!readModelMetadata) {
      throw new NotFoundError(`Could not find read model ${readModelRequest.class.name}`)
    }

    await readModelMetadata.authorizer(readModelRequest.currentUser, readModelRequest)
  }

  private async processSubscription(
    connectionID: string,
    readModelRequest: ReadModelRequestEnvelope<ReadModelInterface>,
    operation: GraphQLOperation
  ): Promise<void> {
    const logger = getLogger(this.config, 'MagekReadModelsReader#processSubscription')
    logger.info(
      `Processing subscription of connection '${connectionID}' to read model '${readModelRequest.class.name}' with the following data: `,
      readModelRequest
    )
    const readModelMetadata = this.config.readModels[readModelRequest.class.name]

    const newReadModelRequest = await applyReadModelRequestBeforeFunctions(
      readModelRequest,
      readModelMetadata.before,
      readModelRequest.currentUser
    )

    const nowEpoch = Math.floor(new Date().getTime() / 1000)
    const subscription: SubscriptionEnvelope = {
      ...newReadModelRequest,
      expirationTime: nowEpoch + this.config.subscriptions.maxDurationInSeconds,
      connectionID,
      operation,
    }
    
    // Store subscription using session store adapter
    await this.config.sessionStore.storeSubscription(
      this.config,
      connectionID,
      operation.id || subscription.requestID,
      subscription
    )
  }

  /**
   * Returns the dependencies of the calculated fields of a read model
   * @param readModelClass The read model class
   * @private
   */
  private getCalculatedFieldsDependencies(readModelClass: AnyClass): Record<string, Array<string>> {
    const readModelMetadata: ReadModelMetadata = this.config.readModels[readModelClass.name]

    const dependenciesMap: Record<string, Array<string>> = {}
    readModelMetadata?.properties.map((property: PropertyMetadata): void => {
      dependenciesMap[property.name] = property.dependencies
    })

    return dependenciesMap
  }
}
