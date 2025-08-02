 
 
import { expect } from '../expect'
import { GlobalErrorHandler, Magek } from '../../src'
import {
  CommandEnvelope,
  CommandMetadata,
  EntityInterface,
  EntitySnapshotEnvelope,
  EventEnvelope,
  EventInterface,
  NotificationInterface,
  ProjectionMetadata,
  ReadModelInterface,
  ReducerMetadata,
  ScheduledCommandEnvelope,
  ScheduledCommandMetadata,
} from '@magek/common'

describe('the `GlobalErrorHandler` decorator', () => {
  afterEach(() => {
    Magek.configure('test', (config) => {
      config.appName = ''
      config.globalErrorsHandler = undefined
    })
  })

  it('adds the error handler class as an error handler in the Magek configuration', () => {
    // Register command
    @GlobalErrorHandler()
    class ErrorHandler {}

    // Make Magek be of any type to access private members
    const magek = Magek as any

    expect(magek.config.globalErrorsHandler.class).to.be.eq(ErrorHandler)
  })

  it('adds the error handler class as an error handler in the Magek configuration with expected methods', () => {
    // Register command
    @GlobalErrorHandler()
    class ErrorHandler {
      public static async onCommandHandlerError(
        error: Error,
        commandEnvelope: CommandEnvelope,
        commandMetadata: CommandMetadata
      ): Promise<Error | undefined> {
        return new Error('')
      }

      public static async onScheduledCommandHandlerError(
        error: Error,
        scheduledCommandEnvelope: ScheduledCommandEnvelope,
        scheduledCommandMetadata: ScheduledCommandMetadata
      ): Promise<Error | undefined> {
        return new Error('')
      }

      public static async onDispatchEventHandlerError(
        error: Error,
        eventEnvelope: EventEnvelope | NotificationInterface,
        eventHandlerMetadata: unknown,
        eventInstance: EventInterface
      ): Promise<Error | undefined> {
        return new Error('')
      }

      public static async onProjectionError(
        error: Error,
        entityEnvelope: EntitySnapshotEnvelope,
        projectionMetadata: ProjectionMetadata<EntityInterface, ReadModelInterface>,
        entity: EntityInterface,
        readModel: ReadModelInterface | undefined
      ): Promise<Error> {
        return new Error('')
      }

      public static async onReducerError(
        error: Error,
        eventEnvelope: EventEnvelope,
        reducerMetadata: ReducerMetadata,
        eventInstance: EventInterface,
        snapshotInstance: EntityInterface | null
      ): Promise<Error> {
        return new Error('')
      }
    }

    // Make Magek be of any type to access private members
    const magek = Magek as any

    expect(magek.config.globalErrorsHandler.class).to.be.eq(ErrorHandler)
  })
})
