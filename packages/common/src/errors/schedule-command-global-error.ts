import { GlobalErrorContainer } from './global-error-container.js'
import { ScheduledCommandMetadata } from '../concepts.js'
import { ScheduledCommandEnvelope } from '../envelope.js'

export class ScheduleCommandGlobalError extends GlobalErrorContainer {
  constructor(
    readonly scheduleCommandEnvelope: ScheduledCommandEnvelope,
    readonly scheduleCommandMetadata: ScheduledCommandMetadata,
    originalError: Error
  ) {
    super(originalError)
  }
}
