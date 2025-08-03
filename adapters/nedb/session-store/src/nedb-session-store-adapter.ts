import { SessionStoreAdapter, MagekConfig, UUID, getLogger } from '@magek/common'
import { WebSocketRegistry } from './web-socket-registry'
import { connectionsDatabase, subscriptionsDatabase } from './paths'

export class NedbSessionStoreAdapter implements SessionStoreAdapter {
  private connectionRegistry: WebSocketRegistry
  private subscriptionRegistry: WebSocketRegistry

  constructor() {
    this.connectionRegistry = new WebSocketRegistry(connectionsDatabase())
    this.subscriptionRegistry = new WebSocketRegistry(subscriptionsDatabase())
  }

  async storeConnection(
    config: MagekConfig,
    connectionId: UUID,
    connectionData: Record<string, any>
  ): Promise<void> {
    const logger = getLogger(config, 'NedbSessionStoreAdapter#storeConnection')
    logger.debug('Storing connection data:', { connectionId, connectionData })
    
    await this.connectionRegistry.store({
      ...connectionData,
      connectionID: connectionId,
    })
  }

  async fetchConnection(
    config: MagekConfig,
    connectionId: UUID
  ): Promise<Record<string, any> | undefined> {
    const results = (await this.connectionRegistry.query({
      connectionID: connectionId,
    })) as Array<Record<string, any>> | undefined
    
    if (!results || results.length === 0) {
      return undefined
    }
    
    // Remove the internal connectionID and NeDB _id fields before returning
    const { connectionID, _id, ...connectionData } = results[0]
    return connectionData
  }

  async deleteConnection(config: MagekConfig, connectionId: UUID): Promise<void> {
    const logger = getLogger(config, 'NedbSessionStoreAdapter#deleteConnection')
    const removed = await this.connectionRegistry.delete({ connectionID: connectionId })
    
    if (removed === 0) {
      logger.info(`No connections found with connectionID=${connectionId}`)
      return
    }
    
    logger.debug('Deleted connection:', connectionId)
  }

  async storeSubscription(
    config: MagekConfig,
    connectionId: UUID,
    subscriptionId: UUID,
    subscriptionData: Record<string, any>
  ): Promise<void> {
    const logger = getLogger(config, 'NedbSessionStoreAdapter#storeSubscription')
    logger.debug('Storing subscription data:', { connectionId, subscriptionId, subscriptionData })
    
    await this.subscriptionRegistry.store({
      ...subscriptionData,
      connectionID: connectionId,
      subscriptionID: subscriptionId,
    })
  }

  async fetchSubscription(
    config: MagekConfig,
    subscriptionId: UUID
  ): Promise<Record<string, any> | undefined> {
    const results = (await this.subscriptionRegistry.query({
      subscriptionID: subscriptionId,
    })) as Array<Record<string, any>> | undefined
    
    if (!results || results.length === 0) {
      return undefined
    }
    
    // Remove internal fields and NeDB _id before returning
    const { connectionID, subscriptionID, _id, ...subscriptionData } = results[0]
    return subscriptionData
  }

  async deleteSubscription(config: MagekConfig, subscriptionId: UUID): Promise<void> {
    const logger = getLogger(config, 'NedbSessionStoreAdapter#deleteSubscription')
    const removed = await this.subscriptionRegistry.delete({ subscriptionID: subscriptionId })
    
    if (removed === 0) {
      logger.info(`No subscription found with subscriptionID=${subscriptionId}`)
      return
    }
    
    logger.debug('Deleted subscription:', subscriptionId)
  }

  async fetchSubscriptionsForConnection(
    config: MagekConfig,
    connectionId: UUID
  ): Promise<Array<Record<string, any>>> {
    const results = (await this.subscriptionRegistry.query({
      connectionID: connectionId,
    })) as Array<Record<string, any>>
    
    // Remove internal fields and NeDB _id from each subscription
    return results.map(({ connectionID, subscriptionID, _id, ...subscriptionData }) => subscriptionData)
  }

  async deleteSubscriptionsForConnection(config: MagekConfig, connectionId: UUID): Promise<void> {
    const logger = getLogger(config, 'NedbSessionStoreAdapter#deleteSubscriptionsForConnection')
    const removed = await this.subscriptionRegistry.delete({ connectionID: connectionId })
    
    logger.debug(`Deleted ${removed} subscriptions for connection:`, connectionId)
  }

  healthCheck = {
    isUp: async (config: MagekConfig): Promise<boolean> => {
      try {
        // Test both registries by doing a simple count operation
        await this.connectionRegistry.count()
        await this.subscriptionRegistry.count()
        return true
      } catch (error) {
        return false
      }
    },

    details: async (config: MagekConfig): Promise<unknown> => {
      try {
        const connectionsCount = await this.connectionRegistry.count()
        const subscriptionsCount = await this.subscriptionRegistry.count()
        
        return {
          status: 'healthy',
          connections: {
            count: connectionsCount,
            database: connectionsDatabase()
          },
          subscriptions: {
            count: subscriptionsCount,
            database: subscriptionsDatabase()
          }
        }
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    },

    urls: async (config: MagekConfig): Promise<Array<string>> => {
      return [
        `file://${connectionsDatabase()}`,
        `file://${subscriptionsDatabase()}`
      ]
    }
  }
}