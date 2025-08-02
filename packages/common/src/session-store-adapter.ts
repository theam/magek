import { BoosterConfig } from './config'
import { UUID } from './concepts'

/**
 * Interface for session store adapters that handle connection and subscription management
 * for real-time features like GraphQL subscriptions and WebSocket connections.
 */
export interface SessionStoreAdapter {
  /**
   * Establishes a new connection and stores connection metadata
   *
   * @param config - The Booster configuration object
   * @param connectionId - Unique identifier for the connection
   * @param connectionData - Metadata associated with the connection
   * @returns A promise that resolves when the connection is established
   */
  storeConnection(
    config: BoosterConfig,
    connectionId: UUID,
    connectionData: Record<string, any>
  ): Promise<void>

  /**
   * Retrieves connection data for a specific connection
   *
   * @param config - The Booster configuration object
   * @param connectionId - Unique identifier for the connection
   * @returns A promise that resolves to the connection data, or undefined if not found
   */
  fetchConnection(
    config: BoosterConfig,
    connectionId: UUID
  ): Promise<Record<string, any> | undefined>

  /**
   * Removes a connection and all associated data
   *
   * @param config - The Booster configuration object
   * @param connectionId - Unique identifier for the connection
   * @returns A promise that resolves when the connection is removed
   */
  deleteConnection(config: BoosterConfig, connectionId: UUID): Promise<void>

  /**
   * Stores subscription information for a connection
   *
   * @param config - The Booster configuration object
   * @param connectionId - Unique identifier for the connection
   * @param subscriptionId - Unique identifier for the subscription
   * @param subscriptionData - Metadata associated with the subscription
   * @returns A promise that resolves when the subscription is stored
   */
  storeSubscription(
    config: BoosterConfig,
    connectionId: UUID,
    subscriptionId: UUID,
    subscriptionData: Record<string, any>
  ): Promise<void>

  /**
   * Retrieves subscription data for a specific subscription
   *
   * @param config - The Booster configuration object
   * @param subscriptionId - Unique identifier for the subscription
   * @returns A promise that resolves to the subscription data, or undefined if not found
   */
  fetchSubscription(
    config: BoosterConfig,
    subscriptionId: UUID
  ): Promise<Record<string, any> | undefined>

  /**
   * Removes a subscription
   *
   * @param config - The Booster configuration object
   * @param subscriptionId - Unique identifier for the subscription
   * @returns A promise that resolves when the subscription is removed
   */
  deleteSubscription(config: BoosterConfig, subscriptionId: UUID): Promise<void>

  /**
   * Retrieves all subscriptions for a specific connection
   *
   * @param config - The Booster configuration object
   * @param connectionId - Unique identifier for the connection
   * @returns A promise that resolves to an array of subscription data
   */
  fetchSubscriptionsForConnection(
    config: BoosterConfig,
    connectionId: UUID
  ): Promise<Array<Record<string, any>>>

  /**
   * Removes all subscriptions associated with a connection
   *
   * @param config - The Booster configuration object
   * @param connectionId - Unique identifier for the connection
   * @returns A promise that resolves when all subscriptions are removed
   */
  deleteSubscriptionsForConnection(config: BoosterConfig, connectionId: UUID): Promise<void>

  /**
   * Health check methods for the session store
   */
  healthCheck?: {
    /**
     * Check if the session store is up and running
     */
    isUp(config: BoosterConfig): Promise<boolean>
    
    /**
     * Get detailed health information about the session store
     */
    details(config: BoosterConfig): Promise<unknown>
    
    /**
     * Get the URLs/endpoints of the session store
     */
    urls(config: BoosterConfig): Promise<Array<string>>
  }
}