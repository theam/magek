import { GlobalErrorContainer } from './global-error-container.js'
import { EventEnvelope } from '../envelope.js'

export class EventGlobalError extends GlobalErrorContainer {
  constructor(readonly eventEnvelope: EventEnvelope, originalError: Error) {
    super(originalError)
  }
}
