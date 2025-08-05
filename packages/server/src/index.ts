import { 
  HasInfrastructure, 
  ProviderLibrary, 
  RocketDescriptor,
  ReadModelInterface,
  MagekConfig,
  FilterFor,
  SortFor,
  ProjectionFor
} from '@magek/common'
import { healthRequestResult, requestFailed, requestSucceeded } from './library/api-adapter'
import { rawGraphQLRequestToEnvelope } from './library/graphql-adapter'

import {
  rawReadModelEventsToEnvelopes,
} from './library/read-model-adapter'
import { rawScheduledInputToEnvelope } from './library/scheduled-adapter'
import {
  deleteConnectionData,
  fetchConnectionData,
  sendMessageToConnection,
  storeConnectionData,
  deleteAllSubscriptions,
  deleteSubscription,
  fetchSubscriptions,
  subscribeToReadModel,
} from './library/session-store-wrapper'
import { rawRocketInputToEnvelope } from './library/rocket-adapter'
import {
  areRocketFunctionsUp,
  graphqlFunctionUrl,
  isGraphQLFunctionUp,
  rawRequestToSensorHealth,
} from './library/health-adapter'

export * from './paths'
export * from './services'
export * from './library/graphql-adapter'

export function loadInfrastructurePackage(packageName: string): HasInfrastructure {
  return require(packageName)
}

export const Provider = (rocketDescriptors?: RocketDescriptor[]): ProviderLibrary => ({
  // ProviderReadModelsLibrary
  readModels: {
    rawToEnvelopes: rawReadModelEventsToEnvelopes,
    fetch: async (config, readModelName, readModelID, sequenceKey?) => {
      // Delegate to read model store adapter if available
      if (config.readModelStoreAdapter) {
        const envelope = await config.readModelStoreAdapter.fetch(config, readModelName, readModelID)
        return envelope ? [envelope.value] : [undefined] as any
      }
      throw new Error('No read model store adapter configured')
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
    ) => {
      // Delegate to read model store adapter if available
      if (config.readModelStoreAdapter) {
        const result = await config.readModelStoreAdapter.search(config, readModelName, {
          filters,
          limit,
          afterCursor: afterCursor as Record<string, string> | undefined,
          paginatedVersion
        })
        // Convert search result to match expected format
        if (paginatedVersion) {
          return {
            items: result.items.map((envelope: any) => envelope.value) as TReadModel[],
            count: result.count,
            cursor: result.cursor
          }
        } else {
          return result.items.map((envelope: any) => envelope.value) as TReadModel[]
        }
      }
      throw new Error('No read model store adapter configured')
    },
    store: (config, readModelName, readModel, expectedCurrentVersion) => {
      // Delegate to read model store adapter if available
      if (config.readModelStoreAdapter) {
        const envelope = {
          typeName: readModelName,
          value: readModel,
          id: readModel.id,
          version: (readModel.magekMetadata?.version ?? 0) + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        return config.readModelStoreAdapter.store(config, readModelName, envelope)
      }
      throw new Error('No read model store adapter configured')
    },
    delete: (config, readModelName, readModel) => {
      // Delegate to read model store adapter if available
      if (config.readModelStoreAdapter && readModel) {
        return config.readModelStoreAdapter.delete(config, readModelName, readModel.id)
      }
      throw new Error('No read model store adapter configured')
    },
    subscribe: subscribeToReadModel,
    fetchSubscriptions: fetchSubscriptions,
    deleteSubscription: deleteSubscription,
    deleteAllSubscriptions: deleteAllSubscriptions,
  },
  // ProviderGraphQLLibrary
  graphQL: {
    rawToEnvelope: rawGraphQLRequestToEnvelope,
    handleResult: requestSucceeded,
  },
  // ProviderAPIHandling
  api: {
    requestSucceeded,
    requestFailed,
    healthRequestResult,
  },
  connections: {
    storeData: storeConnectionData,
    fetchData: fetchConnectionData,
    deleteData: deleteConnectionData,
    sendMessage: sendMessageToConnection,
  },
  // ScheduledCommandsLibrary
  scheduled: {
    rawToEnvelope: rawScheduledInputToEnvelope,
  },
  rockets: {
    rawToEnvelopes: rawRocketInputToEnvelope,
  },
  sensor: {
    databaseEventsHealthDetails: (config: MagekConfig) => {
      // Delegate to event store adapter health check if available
      if (config.eventStoreAdapter?.healthCheck) {
        return config.eventStoreAdapter.healthCheck.details(config)
      }
      throw new Error('No event store adapter configured for health checks')
    },
    databaseReadModelsHealthDetails: (config) => {
      // Delegate to read model store adapter health check if available
      if (config.readModelStoreAdapter?.healthCheck) {
        return config.readModelStoreAdapter.healthCheck.details(config)
      }
      throw new Error('No read model store adapter configured for health checks')
    },
    isDatabaseEventUp: (config) => {
      // Delegate to event store adapter health check if available
      if (config.eventStoreAdapter?.healthCheck) {
        return config.eventStoreAdapter.healthCheck.isUp(config)
      }
      return Promise.resolve(false)
    },
    areDatabaseReadModelsUp: (config) => {
      // Delegate to read model store adapter health check if available
      if (config.readModelStoreAdapter?.healthCheck) {
        return config.readModelStoreAdapter.healthCheck.isUp(config)
      }
      return Promise.resolve(false)
    },
    databaseUrls: (config) => {
      // Get URLs from both event store and read model store adapters
      const eventUrls = config.eventStoreAdapter?.healthCheck?.urls(config) ?? Promise.resolve([])
      const readModelUrls = config.readModelStoreAdapter?.healthCheck?.urls(config) ?? Promise.resolve([])
      
      return Promise.all([eventUrls, readModelUrls]).then(([events, readModels]) => [
        ...events,
        ...readModels
      ])
    },
    isGraphQLFunctionUp: isGraphQLFunctionUp,
    graphQLFunctionUrl: graphqlFunctionUrl,
    rawRequestToHealthEnvelope: rawRequestToSensorHealth,
    areRocketFunctionsUp: areRocketFunctionsUp,
  },
  // ProviderInfrastructureGetter
  infrastructure: () => {
    const infrastructurePackageName = '@magek/server-infrastructure'
    let infrastructure: HasInfrastructure | undefined

    try {
      infrastructure = loadInfrastructurePackage(infrastructurePackageName)
    } catch (e) {
      throw new Error(
        `The Local infrastructure package could not be loaded. The following error was thrown: ${e.message}. Please ensure that one of the following actions has been done:\n` +
          `  - It has been specified in your "devDependencies" section of your "package.json" file. You can do so by running 'npm install --save-dev ${infrastructurePackageName}'\n` +
          `  - Or it has been installed globally. You can do so by running 'npm install -g ${infrastructurePackageName}'`
      )
    }

    return infrastructure.Infrastructure(rocketDescriptors)
  },
})
