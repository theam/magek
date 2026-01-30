// Polyfill for Symbol.metadata (required for TC39 Stage 3 decorators)
// Must be defined before any decorated code is imported
// Node.js 22.x doesn't have native Symbol.metadata yet
(Symbol as unknown as { metadata: symbol }).metadata ??= Symbol.for('Symbol.metadata')

import { Magek } from './magek'
import { MagekEventDispatcher } from './event-dispatcher'
import { MagekGraphQLDispatcher } from './graphql-dispatcher'
import { MagekScheduledCommandDispatcher } from './scheduled-command-dispatcher'
import { MagekSubscribersNotifier } from './subscribers-notifier'
import { MagekEventStreamConsumer } from './event-stream-consumer'
import { MagekEventStreamProducer } from './event-stream-producer'
import { MagekHealthService } from './sensor'

// Exports
export { Magek } from './magek'
export { RegisterHandler } from './register-handler'
export * from './decorators'
export { MagekDataMigrations } from './data-migrations'
export { MagekDataMigrationFinished } from './core-concepts/data-migration/events/data-migration-finished'
export { MagekDataMigrationEntity } from './core-concepts/data-migration/entities/data-migration-entity'
export { MagekTouchEntityHandler } from './touch-entity-handler'
export * from './services/token-verifiers'
export * from './instrumentation/index'
export * from './decorators/health-sensor'

/**
 * Pushes a page of events to be processed by the event dispatcher.
 *
 * @param rawEvents A runtime-specific representation of the events to be processed
 * @returns A promise that resolves when the events are processed
 */
export async function eventDispatcher(rawEvents: unknown): Promise<void> {
  return MagekEventDispatcher.dispatch(rawEvents, Magek.config)
}

/**
 * Serves a GraphQL request. GraphQL resolvers can send response objects back to the client.
 *
 * @param rawRequest A runtime-specific representation of the GraphQL request.
 * @returns A promise that resolves to the GraphQL response.
 */
export async function graphQLDispatcher(rawRequest: unknown): Promise<unknown> {
  return new MagekGraphQLDispatcher(Magek.config).dispatch(rawRequest)
}

/**
 * Triggers pending scheduled commands. This function is meant to be called by a scheduler.
 *
 * @param rawRequest A runtime-specific representation of the request to trigger scheduled commands
 * @returns A promise that resolves when the scheduled commands are triggered
 */
export async function triggerScheduledCommands(rawRequest: unknown): Promise<void> {
  return new MagekScheduledCommandDispatcher(Magek.config).dispatch(rawRequest)
}

/**
 * Notifies subscribers of a new update on a read model
 *
 * @param rawRequest A runtime-specific representation of the request to notify subscribers.
 * @returns A promise that resolves when the subscribers are notified
 */
export async function notifySubscribers(rawRequest: unknown): Promise<void> {
  return new MagekSubscribersNotifier(Magek.config).dispatch(rawRequest)
}

/**
 * Consumes events from the event stream and dispatches them to the event handlers
 *
 * @param rawEvent A runtime-specific representation of the event to be processed
 * @returns A promise that resolves when the event is processed
 */
export async function consumeEventStream(rawEvent: unknown): Promise<unknown> {
  return MagekEventStreamConsumer.consume(rawEvent, Magek.config)
}

/**
 * Produces events to the event stream
 *
 * @param rawEvent A runtime-specific representation of the event to be produced
 * @returns A promise that resolves when the event is produced
 */
export async function produceEventStream(rawEvent: unknown): Promise<unknown> {
  return MagekEventStreamProducer.produce(rawEvent, Magek.config)
}

/**
 * Returns the health of the application
 *
 * @param request A runtime-specific representation of the request to check the health
 * @returns A promise that resolves to the health of the application
 */
export async function health(request: unknown): Promise<unknown> {
  return new MagekHealthService(Magek.config).health(request)
}
