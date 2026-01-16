import { Runtime, MagekConfig, getLogger } from '@magek/common'
import { healthRequestResult, requestFailed, requestSucceeded } from './library/api-adapter'
import { rawGraphQLRequestToEnvelope } from './library/graphql-adapter'

import { rawScheduledInputToEnvelope } from './library/scheduled-adapter'
import {
  graphqlFunctionUrl,
  isGraphQLFunctionUp,
  rawRequestToSensorHealth,
} from './library/health-adapter'

export * from './paths'
export * from './services'
export * from './library/graphql-adapter'
export { createServer, getWebSocketRegistry, sendWebSocketMessage } from './server'
export type { ServerOptions } from './server'

export const ServerRuntime: Runtime = {
  // GraphQLRuntime
  graphQL: {
    rawToEnvelope: rawGraphQLRequestToEnvelope,
    handleResult: requestSucceeded,
  },
  // APIRuntime
  api: {
    requestSucceeded,
    requestFailed,
    healthRequestResult,
  },
  // MessagingRuntime
  messaging: {
    sendMessage: async (config: MagekConfig, connectionID: string, data: unknown) => {
      // Use the global WebSocket registry for message sending
      const globalRegistry = (global as any).webSocketRegistry
      if (globalRegistry && typeof globalRegistry.sendMessage === 'function') {
        globalRegistry.sendMessage(connectionID, data)
      } else {
        const logger = getLogger(config, 'ServerRuntime')
        logger.warn(`WebSocket registry not available. Message not sent to connection ${connectionID}`)
      }
    },
  },
  // ScheduledRuntime
  scheduled: {
    rawToEnvelope: rawScheduledInputToEnvelope,
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
  },
}
