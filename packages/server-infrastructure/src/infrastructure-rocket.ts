import { BoosterConfig } from '@booster-ai/common'

export interface InfrastructureRocketMetadata {
  port: number
}

/**
 * Generic router interface that abstracts away the underlying server implementation.
 * This allows rockets to work with different HTTP server implementations.
 */
export interface GenericRouter {
  // Basic router methods that can be implemented by different server frameworks
  get?(path: string, handler: any): void
  post?(path: string, handler: any): void
  put?(path: string, handler: any): void
  delete?(path: string, handler: any): void
  use?(path: string | any, handler?: any): void
}

export interface InfrastructureRocket {
  mountStack: (
    config: BoosterConfig,
    router: GenericRouter,
    infrastructureRocketMetadata?: InfrastructureRocketMetadata
  ) => void
  unmountStack?: () => void
}
