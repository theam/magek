import { GlobalErrorContainer } from './global-error-container.js'
import { EntityInterface, EventInterface, ReducerMetadata } from '../concepts/index.js'
import { EventEnvelope } from '../envelope.js'

export class ReducerGlobalError extends GlobalErrorContainer {
  constructor(
    readonly eventEnvelope: EventEnvelope,
    readonly eventInstance: EventInterface,
    readonly snapshotInstance: EntityInterface | null,
    readonly reducerMetadata: ReducerMetadata,
    originalError: Error
  ) {
    super(originalError)
  }
}
