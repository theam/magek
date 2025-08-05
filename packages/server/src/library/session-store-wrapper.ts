import { MagekConfig, ConnectionDataEnvelope, SubscriptionEnvelope, getLogger } from '@magek/common'

/**
 * Wrapper functions that adapt the new SessionStoreAdapter interface
 * to the existing function signatures for backward compatibility
 */

export async function storeConnectionData(
  config: MagekConfig,
  connectionId: string,
  data: ConnectionDataEnvelope
): Promise<void> {
  const logger = getLogger(config, 'session-store-wrapper#storeConnectionData')
  logger.debug('Storing connection data:', data)
  
  if (!config.sessionStoreAdapter) {
    throw new Error('No session store adapter configured')
  }
  
  await config.sessionStoreAdapter.storeConnection(config, connectionId, data)
}

export async function fetchConnectionData(
  config: MagekConfig,
  connectionId: string
): Promise<ConnectionDataEnvelope | undefined> {
  if (!config.sessionStoreAdapter) {
    throw new Error('No session store adapter configured')
  }
  
  const result = await config.sessionStoreAdapter.fetchConnection(config, connectionId)
  return result as ConnectionDataEnvelope | undefined
}

export async function deleteConnectionData(
  config: MagekConfig,
  connectionId: string
): Promise<void> {
  const logger = getLogger(config, 'session-store-wrapper#deleteConnectionData')
  
  if (!config.sessionStoreAdapter) {
    throw new Error('No session store adapter configured')
  }
  
  await config.sessionStoreAdapter.deleteConnection(config, connectionId)
  logger.debug('Deleted connection:', connectionId)
}

export async function sendMessageToConnection(
  config: MagekConfig,
  connectionId: string,
  data: unknown
): Promise<void> {
  const logger = getLogger(config, 'session-store-wrapper#sendMessageToConnection')
  logger.debug(`Sending message ${JSON.stringify(data)} to connection ${connectionId}`)
  
  // Check if the global variable exists in the process to avoid importing server-infrastructure
  const globalRegistry = (global as any).webSocketRegistry
  if (globalRegistry && typeof globalRegistry.sendMessage === 'function') {
    globalRegistry.sendMessage(connectionId, data)
  } else {
    logger.warn(`WebSocket registry not available. Message not sent to connection ${connectionId}`)
  }
}

export async function subscribeToReadModel(
  config: MagekConfig,
  subscriptionEnvelope: SubscriptionEnvelope
): Promise<void> {
  if (!config.sessionStoreAdapter) {
    throw new Error('No session store adapter configured')
  }
  
  // Extract connectionID and generate a subscriptionID if not present
  const { connectionID, operation, ...subscriptionData } = subscriptionEnvelope
  const subscriptionId = operation.id || `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  await config.sessionStoreAdapter.storeSubscription(
    config,
    connectionID,
    subscriptionId,
    {
      ...subscriptionData,
      operation,
      subscriptionID: subscriptionId
    }
  )
}

export async function fetchSubscriptions(
  config: MagekConfig,
  subscriptionName: string
): Promise<Array<SubscriptionEnvelope>> {
  if (!config.sessionStoreAdapter) {
    throw new Error('No session store adapter configured')
  }
  
  // Use the additional method that supports className filtering  
  const adapter = config.sessionStoreAdapter as any
  if (adapter.fetchSubscriptionsByClassName) {
    return await adapter.fetchSubscriptionsByClassName(config, subscriptionName) as Array<SubscriptionEnvelope>
  }
  
  throw new Error('Session store adapter does not support fetchSubscriptionsByClassName')
}

export async function deleteSubscription(
  config: MagekConfig,
  connectionID: string,
  subscriptionID: string
): Promise<void> {
  if (!config.sessionStoreAdapter) {
    throw new Error('No session store adapter configured')
  }
  
  await config.sessionStoreAdapter.deleteSubscription(config, subscriptionID)
}

export async function deleteAllSubscriptions(
  config: MagekConfig,
  connectionID: string
): Promise<void> {
  if (!config.sessionStoreAdapter) {
    throw new Error('No session store adapter configured')
  }
  
  await config.sessionStoreAdapter.deleteSubscriptionsForConnection(config, connectionID)
}