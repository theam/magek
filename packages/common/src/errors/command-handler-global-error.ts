import { GlobalErrorContainer } from './global-error-container.js'
import { CommandEnvelope } from '../envelope.js'
import { CommandMetadata } from '../concepts.js'

export class CommandHandlerGlobalError extends GlobalErrorContainer {
  constructor(
    readonly commandEnvelope: CommandEnvelope,
    readonly commandMetadata: CommandMetadata,
    originalError: Error
  ) {
    super(originalError)
  }
}
