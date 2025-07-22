import { HasInfrastructure, ProviderLibrary, RocketDescriptor, UserApp } from '@booster-ai/common'
import { healthRequestResult, requestFailed, requestSucceeded } from './library/api-adapter'
import { GraphQLService, ReadModelRegistry } from './services'
import { rawGraphQLRequestToEnvelope } from './library/graphql-adapter'

import * as path from 'path'

import {
  deleteReadModel,
  fetchReadModel,
  rawReadModelEventsToEnvelopes,
  searchReadModel,
  storeReadModel,
} from './library/read-model-adapter'
import { rawScheduledInputToEnvelope } from './library/scheduled-adapter'
import {
  deleteConnectionData,
  fetchConnectionData,
  sendMessageToConnection,
  storeConnectionData,
} from './library/connections-adapter'
import {
  deleteAllSubscriptions,
  deleteSubscription,
  fetchSubscriptions,
  subscribeToReadModel,
} from './library/subscription-adapter'
import { WebSocketRegistry } from './services/web-socket-registry'
import { connectionsDatabase, subscriptionDatabase } from './paths'
import { rawRocketInputToEnvelope } from './library/rocket-adapter'
import {
  areDatabaseReadModelsUp,
  areRocketFunctionsUp,
  databaseReadModelsHealthDetails,
  databaseUrl,
  graphqlFunctionUrl,
  isGraphQLFunctionUp,
  rawRequestToSensorHealth,
} from './library/health-adapter'
import * as process from 'process'

export * from './paths'
export * from './services'
export * from './library/graphql-adapter'

const readModelRegistry = new ReadModelRegistry()
const connectionRegistry = new WebSocketRegistry(connectionsDatabase)
const subscriptionRegistry = new WebSocketRegistry(subscriptionDatabase)
const userApp: UserApp = require(path.join(process.cwd(), 'dist', 'index.js'))
const graphQLService = new GraphQLService(userApp)

export function loadInfrastructurePackage(packageName: string): HasInfrastructure {
  return require(packageName)
}

export const Provider = (rocketDescriptors?: RocketDescriptor[]): ProviderLibrary => ({
  // ProviderReadModelsLibrary
  readModels: {
    rawToEnvelopes: rawReadModelEventsToEnvelopes,
    fetch: fetchReadModel.bind(null, readModelRegistry),
    search: searchReadModel.bind(null, readModelRegistry),
    store: storeReadModel.bind(null, graphQLService, readModelRegistry),
    delete: deleteReadModel.bind(null, readModelRegistry),
    subscribe: subscribeToReadModel.bind(null, subscriptionRegistry),
    fetchSubscriptions: fetchSubscriptions.bind(null, subscriptionRegistry),
    deleteSubscription: deleteSubscription.bind(null, subscriptionRegistry),
    deleteAllSubscriptions: deleteAllSubscriptions.bind(null, subscriptionRegistry),
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
    storeData: storeConnectionData.bind(null, connectionRegistry),
    fetchData: fetchConnectionData.bind(null, connectionRegistry),
    deleteData: deleteConnectionData.bind(null, connectionRegistry),
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
    databaseEventsHealthDetails: (config) => {
      // Delegate to event store adapter health check if available
      if (config.eventStoreAdapter?.healthCheck) {
        return config.eventStoreAdapter.healthCheck.details(config)
      }
      throw new Error('No event store adapter configured for health checks')
    },
    databaseReadModelsHealthDetails: databaseReadModelsHealthDetails.bind(null, readModelRegistry),
    isDatabaseEventUp: (config) => {
      // Delegate to event store adapter health check if available
      if (config.eventStoreAdapter?.healthCheck) {
        return config.eventStoreAdapter.healthCheck.isUp(config)
      }
      return Promise.resolve(false)
    },
    areDatabaseReadModelsUp: areDatabaseReadModelsUp,
    databaseUrls: (config) => {
      // Delegate to event store adapter health check if available
      if (config.eventStoreAdapter?.healthCheck) {
        return config.eventStoreAdapter.healthCheck.urls(config)
      }
      return databaseUrl()
    },
    isGraphQLFunctionUp: isGraphQLFunctionUp,
    graphQLFunctionUrl: graphqlFunctionUrl,
    rawRequestToHealthEnvelope: rawRequestToSensorHealth,
    areRocketFunctionsUp: areRocketFunctionsUp,
  },
  // ProviderInfrastructureGetter
  infrastructure: () => {
    const infrastructurePackageName = '@booster-ai/server-infrastructure'
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
