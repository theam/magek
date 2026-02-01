// =============================================================================
// PUBLIC API - Core Framework Types
// These are the primary exports for framework users building Magek applications
// =============================================================================
export * from './app'
export * from './config'
export * from './concepts'
export * from './envelope'
export * from './errors'
export * from './errors/index'
export * from './logger'
export * from './searcher'

// =============================================================================
// ADAPTER DEVELOPMENT
// Types and utilities for building custom adapters (event stores, read models, etc.)
// =============================================================================
export * from './event-store-adapter'
export * from './read-model-store-adapter'
export * from './session-store-adapter'
export * from './retrier'
export * from './timestamp-generator'
export * from './instances'
export * from './groups'
export * from './stream-types'

// =============================================================================
// FRAMEWORK INTERNALS
// Used by @magek/core, @magek/server, and other framework packages
// These may change between versions - use with caution in user code
// =============================================================================
export * from './typelevel'
export * from './runtime'
export * from './user-app'
export * from './metadata-types'
export * from './super-kind'
export * from './schedule'
export * from './data-migration-parameters'
export * from './graphql-websocket-messages'
export * from './http-service'
export * from './instrumentation/trace-types'
export * from './sensor/health-indicator-configuration'
