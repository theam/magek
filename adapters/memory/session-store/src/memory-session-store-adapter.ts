import { SessionStoreAdapter, MagekConfig, UUID, getLogger, SubscriptionEnvelope } from '@magek/common'

export class MemorySessionStoreAdapter implements SessionStoreAdapter {
  private connections: Map<UUID, Record<string, any>> = new Map()
  private subscriptions: Map<UUID, Record<string, any>> = new Map()
  private subscriptionsByConnection: Map<UUID, Set<UUID>> = new Map()
  private subscriptionsByClassName: Map<string, Set<UUID>> = new Map()

  async storeConnection(
    config: MagekConfig,
    connectionId: UUID,
    connectionData: Record<string, any>
  ): Promise<void> {
    const logger = getLogger(config, 'MemorySessionStoreAdapter#storeConnection')
    logger.debug('Storing connection data:', { connectionId, connectionData })

    this.connections.set(connectionId, {
      ...connectionData,
      connectionID: connectionId,
    })
  }

  async fetchConnection(
    config: MagekConfig,
    connectionId: UUID
  ): Promise<Record<string, any> | undefined> {
    const data = this.connections.get(connectionId)

    if (!data) {
      return undefined
    }

    // Remove internal fields before returning
    const { connectionID, ...connectionData } = data
    return connectionData
  }

  async deleteConnection(config: MagekConfig, connectionId: UUID): Promise<void> {
    const logger = getLogger(config, 'MemorySessionStoreAdapter#deleteConnection')

    if (!this.connections.has(connectionId)) {
      logger.info(`No connections found with connectionID=${connectionId}`)
      return
    }

    this.connections.delete(connectionId)
    logger.debug('Deleted connection:', connectionId)
  }

  async storeSubscription(
    config: MagekConfig,
    connectionId: UUID,
    subscriptionId: UUID,
    subscriptionData: Record<string, any>
  ): Promise<void> {
    const logger = getLogger(config, 'MemorySessionStoreAdapter#storeSubscription')
    logger.debug('Storing subscription data:', { connectionId, subscriptionId, subscriptionData })

    const data = {
      ...subscriptionData,
      connectionID: connectionId,
      subscriptionID: subscriptionId,
    }

    this.subscriptions.set(subscriptionId, data)

    // Index by connection
    if (!this.subscriptionsByConnection.has(connectionId)) {
      this.subscriptionsByConnection.set(connectionId, new Set())
    }
    this.subscriptionsByConnection.get(connectionId)!.add(subscriptionId)

    // Index by className if present
    const className = subscriptionData.className
    if (className) {
      if (!this.subscriptionsByClassName.has(className)) {
        this.subscriptionsByClassName.set(className, new Set())
      }
      this.subscriptionsByClassName.get(className)!.add(subscriptionId)
    }
  }

  async fetchSubscription(
    config: MagekConfig,
    subscriptionId: UUID
  ): Promise<Record<string, any> | undefined> {
    const data = this.subscriptions.get(subscriptionId)

    if (!data) {
      return undefined
    }

    // Remove internal fields before returning
    const { connectionID, subscriptionID, ...subscriptionData } = data
    return subscriptionData
  }

  async deleteSubscription(config: MagekConfig, connectionId: UUID, subscriptionId: UUID): Promise<void> {
    const logger = getLogger(config, 'MemorySessionStoreAdapter#deleteSubscription')

    const data = this.subscriptions.get(subscriptionId)
    if (!data) {
      logger.info(`No subscription found with connectionID=${connectionId} and subscriptionID=${subscriptionId}`)
      return
    }

    // Remove from className index
    const className = data.className
    if (className) {
      this.subscriptionsByClassName.get(className)?.delete(subscriptionId)
    }

    // Remove from connection index
    this.subscriptionsByConnection.get(connectionId)?.delete(subscriptionId)

    // Remove subscription
    this.subscriptions.delete(subscriptionId)

    logger.debug('Deleted subscription:', { connectionId, subscriptionId })
  }

  async fetchSubscriptionsForConnection(
    config: MagekConfig,
    connectionId: UUID
  ): Promise<Array<Record<string, any>>> {
    const subscriptionIds = this.subscriptionsByConnection.get(connectionId)

    if (!subscriptionIds) {
      return []
    }

    const results: Array<Record<string, any>> = []
    for (const subscriptionId of Array.from(subscriptionIds)) {
      const data = this.subscriptions.get(subscriptionId)
      if (data) {
        const { connectionID, subscriptionID, ...subscriptionData } = data
        results.push(subscriptionData)
      }
    }

    return results
  }

  async fetchSubscriptionsByClassName(
    config: MagekConfig,
    className: string
  ): Promise<Array<SubscriptionEnvelope>> {
    const subscriptionIds = this.subscriptionsByClassName.get(className)

    if (!subscriptionIds) {
      return []
    }

    const results: Array<SubscriptionEnvelope> = []
    for (const subscriptionId of Array.from(subscriptionIds)) {
      const data = this.subscriptions.get(subscriptionId)
      if (data) {
        results.push(data as SubscriptionEnvelope)
      }
    }

    return results
  }

  async deleteSubscriptionsForConnection(config: MagekConfig, connectionId: UUID): Promise<void> {
    const logger = getLogger(config, 'MemorySessionStoreAdapter#deleteSubscriptionsForConnection')

    const subscriptionIds = this.subscriptionsByConnection.get(connectionId)

    if (!subscriptionIds || subscriptionIds.size === 0) {
      logger.debug(`No subscriptions found for connection: ${connectionId}`)
      return
    }

    let removed = 0
    for (const subscriptionId of Array.from(subscriptionIds)) {
      const data = this.subscriptions.get(subscriptionId)
      if (data) {
        // Remove from className index
        const className = data.className
        if (className) {
          this.subscriptionsByClassName.get(className)?.delete(subscriptionId)
        }

        this.subscriptions.delete(subscriptionId)
        removed++
      }
    }

    // Clear the connection's subscription set
    this.subscriptionsByConnection.delete(connectionId)

    logger.debug(`Deleted ${removed} subscriptions for connection:`, connectionId)
  }

  healthCheck = {
    isUp: async (config: MagekConfig): Promise<boolean> => {
      // In-memory store is always up if the process is running
      return true
    },

    details: async (config: MagekConfig): Promise<unknown> => {
      return {
        type: 'memory',
        status: 'healthy',
        connections: {
          count: this.connections.size,
        },
        subscriptions: {
          count: this.subscriptions.size,
        },
      }
    },

    urls: async (config: MagekConfig): Promise<Array<string>> => {
      return ['memory://in-memory-session-store']
    },
  }

  // Helper methods for testing
  getConnectionsCount(): number {
    return this.connections.size
  }

  getSubscriptionsCount(): number {
    return this.subscriptions.size
  }

  clear(): void {
    this.connections.clear()
    this.subscriptions.clear()
    this.subscriptionsByConnection.clear()
    this.subscriptionsByClassName.clear()
  }
}
