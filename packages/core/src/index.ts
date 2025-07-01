import { Magek } from './booster'
import { BoosterEventDispatcher } from './booster-event-dispatcher'
import { BoosterGraphQLDispatcher } from './booster-graphql-dispatcher'
import { BoosterScheduledCommandDispatcher } from './booster-scheduled-command-dispatcher'
import { BoosterSubscribersNotifier } from './booster-subscribers-notifier'
import { BoosterRocketDispatcher } from './booster-rocket-dispatcher'
import { BoosterEventStreamConsumer } from './booster-event-stream-consumer'
import { BoosterEventStreamProducer } from './booster-event-stream-producer'
import { BoosterHealthService } from './sensor'

// Exports
export { Magek } from './booster'
export { RegisterHandler } from './booster-register-handler'
export * from './decorators'
export { BoosterDataMigrations } from './booster-data-migrations'
export { BoosterDataMigrationFinished } from './core-concepts/data-migration/events/booster-data-migration-finished'
export { BoosterDataMigrationEntity } from './core-concepts/data-migration/entities/booster-data-migration-entity'
export { BoosterTouchEntityHandler } from './booster-touch-entity-handler'
export * from './services/token-verifiers'
export * from './instrumentation/index'
export * from './decorators/health-sensor'
export * as Injectable from './injectable'

/**
 * Pushes a page of events to be processed by the event dispatcher.
 *
 * @param rawEvents A provider-specific representation of the events to be processed
 * @returns A promise that resolves when the events are processed
 */
export async function magekEventDispatcher(rawEvents: unknown): Promise<void> {
  return BoosterEventDispatcher.dispatch(rawEvents, Magek.config)
}

/**
 * Serves a GraphQL request. GraphQL resolvers can send response objects back to the client.
 *
 * @param rawRequest A provider-specific representation of the GraphQL request.
 * @returns A promise that resolves to the GraphQL response.
 */
export async function magekServeGraphQL(rawRequest: unknown): Promise<unknown> {
  return new BoosterGraphQLDispatcher(Magek.config).dispatch(rawRequest)
}

/**
 * Triggers pending scheduled commands. This function is meant to be called by a scheduler.
 *
 * @param rawRequest A provider-specific representation of the request to trigger scheduled commands
 * @returns A promise that resolves when the scheduled commands are triggered
 */
export async function magekTriggerScheduledCommands(rawRequest: unknown): Promise<void> {
  return new BoosterScheduledCommandDispatcher(Magek.config).dispatch(rawRequest)
}

/**
 * @deprecated [EOL v3] Please use `boosterTriggerScheduledCommands` instead.
 */
export const magekTriggerScheduledCommand = magekTriggerScheduledCommands

/**
 * Notifies subscribers of a new update on a read model
 *
 * @param rawRequest A provider-specific representation of the request to notify subscribers.
 * @returns A promise that resolves when the subscribers are notified
 */
export async function magekNotifySubscribers(rawRequest: unknown): Promise<void> {
  return new BoosterSubscribersNotifier(Magek.config).dispatch(rawRequest)
}

/**
 * Endpoint that proxies a request to functionality exposed by a Rocket
 *
 * @param rawRequest A provider-specific representation of the request to be processed
 * @returns A promise that resolves when the request is processed
 */
export async function magekRocketDispatcher(rawRequest: unknown): Promise<unknown> {
  return new BoosterRocketDispatcher(Magek.config).dispatch(rawRequest)
}

/**
 * Consumes events from the event stream and dispatches them to the event handlers
 *
 * @param rawEvent A provider-specific representation of the event to be processed
 * @returns A promise that resolves when the event is processed
 */
export async function magekConsumeEventStream(rawEvent: unknown): Promise<unknown> {
  return BoosterEventStreamConsumer.consume(rawEvent, Magek.config)
}

/**
 * Produces events to the event stream
 *
 * @param rawEvent A provider-specific representation of the event to be produced
 * @returns A promise that resolves when the event is produced
 */
export async function magekProduceEventStream(rawEvent: unknown): Promise<unknown> {
  return BoosterEventStreamProducer.produce(rawEvent, Magek.config)
}

/**
 * Returns the health of the application
 *
 * @param request A provider-specific representation of the request to check the health
 * @returns A promise that resolves to the health of the application
 */
export async function magekHealth(request: unknown): Promise<unknown> {
  return new BoosterHealthService(Magek.config).boosterHealth(request)
}
