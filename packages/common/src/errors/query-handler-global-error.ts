import { GlobalErrorContainer } from './global-error-container.js'
import { QueryEnvelope } from '../envelope.js'

export class QueryHandlerGlobalError extends GlobalErrorContainer {
  constructor(readonly query: QueryEnvelope, originalError: Error) {
    super(originalError)
  }
}
