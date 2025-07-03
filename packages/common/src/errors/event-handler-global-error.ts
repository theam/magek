import { GlobalErrorContainer } from './global-error-container.js'
import { EventInterface, NotificationInterface } from '../concepts.js'
import { EventEnvelope } from '../envelope.js'

export class EventHandlerGlobalError extends GlobalErrorContainer {
  constructor(
    readonly eventEnvelope: EventEnvelope | NotificationInterface,
    readonly eventInstance: EventInterface,
    readonly eventHandlerMetadata: unknown,
    originalError: Error
  ) {
    super(originalError)
  }
}
