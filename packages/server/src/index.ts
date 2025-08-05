import { 
  HasInfrastructure, 
  ProviderLibrary, 
  RocketDescriptor,
  MagekConfig
} from '@magek/common'
import { healthRequestResult, requestFailed, requestSucceeded } from './library/api-adapter'
import { rawGraphQLRequestToEnvelope } from './library/graphql-adapter'

import { rawScheduledInputToEnvelope } from './library/scheduled-adapter'
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
