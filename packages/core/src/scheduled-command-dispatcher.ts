import {
  MagekConfig,
  ScheduledCommandEnvelope,
  Register,
  NotFoundError,
  ScheduledCommandInterface,
  ScheduleCommandGlobalError,
  TraceActionTypes,
  getLogger,
} from '@magek/common'
import { RegisterHandler } from './register-handler'
import { MagekGlobalErrorDispatcher } from './global-error-dispatcher'
import { trace } from './instrumentation'

export class MagekScheduledCommandDispatcher {
  private readonly globalErrorDispatcher: MagekGlobalErrorDispatcher

  public constructor(readonly config: MagekConfig) {
    this.globalErrorDispatcher = new MagekGlobalErrorDispatcher(config)
  }

  @trace(TraceActionTypes.SCHEDULED_COMMAND_HANDLER)
  public async dispatchCommand(commandEnvelope: ScheduledCommandEnvelope): Promise<void> {
    const logger = getLogger(this.config, 'MagekScheduledCommandDispatcher#dispatchCommand')
    logger.debug('Dispatching the following scheduled command envelope: ', commandEnvelope)

    const commandMetadata = this.config.scheduledCommandHandlers[commandEnvelope.typeName]
    if (!commandMetadata) {
      throw new NotFoundError(`Could not find a proper handler for ${commandEnvelope.typeName}`)
    }

    const commandClass = commandMetadata.class
    logger.debug('Found the following command:', commandClass.name)
    const command = commandClass as ScheduledCommandInterface
    const register = new Register(
      commandEnvelope.requestID,
      {},
      RegisterHandler.flush,
      undefined,
      commandEnvelope.context
    )
    try {
      logger.debug('Calling "handle" method on command: ', command)
      await command.handle(register)
    } catch (e) {
      const error = await this.globalErrorDispatcher.dispatch(
        new ScheduleCommandGlobalError(commandEnvelope, commandMetadata, e)
      )
      if (error) throw error
    }
    logger.debug('Command dispatched with register: ', register)
    await RegisterHandler.handle(this.config, register)
  }

  /**
   * Entry point to dispatch scheduled commands.
   * @param request The incoming request
   */
  public async dispatch(request: unknown): Promise<void> {
    const logger = getLogger(this.config, 'MagekScheduledCommandDispatcher#dispatch')
    const envelopeOrError = await this.config.runtime.scheduled.rawToEnvelope(this.config, request)
    logger.debug('Received ScheduledCommand envelope...', envelopeOrError)
    await this.dispatchCommand(envelopeOrError)
  }
}
