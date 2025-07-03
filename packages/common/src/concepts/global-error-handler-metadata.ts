import { AnyClass } from '../typelevel.js'
import {
  CommandEnvelope,
  EntitySnapshotEnvelope,
  EventEnvelope,
  NonPersistedEntitySnapshotEnvelope,
  QueryEnvelope,
  ScheduledCommandEnvelope,
} from '../envelope.js'
import { EventInterface } from './event.js'
import { ReadModelInterface } from './read-model.js'
import { EntityInterface } from './entity.js'
import { ReducerMetadata } from './reducer-metadata.js'
import { ScheduledCommandMetadata } from './scheduled-command.js'
import { CommandMetadata } from './command.js'
import { ProjectionMetadata } from './projection-metadata.js'
import { NotificationInterface } from './notification.js'

export interface GlobalErrorHandlerInterface extends AnyClass {
  onCommandHandlerError?(
    error: Error,
    commandEnvelope: CommandEnvelope,
    commandMetadata: CommandMetadata
  ): Promise<Error | undefined>
  onQueryHandlerError?(error: Error, query: QueryEnvelope): Promise<Error | undefined>
  onScheduledCommandHandlerError?(
    error: Error,
    scheduledCommandEnvelope: ScheduledCommandEnvelope,
    scheduledCommandMetadata: ScheduledCommandMetadata
  ): Promise<Error | undefined>
  onDispatchEventHandlerError?(
    error: Error,
    eventEnvelope: EventEnvelope | NotificationInterface,
    eventHandlerMetadata: unknown,
    eventInstance: EventInterface
  ): Promise<Error | undefined>
  onReducerError?(
    error: Error,
    eventEnvelope: EventEnvelope,
    reducerMetadata: ReducerMetadata,
    eventInstance: EventInterface,
    snapshotInstance: EntityInterface | null
  ): Promise<Error>
  onProjectionError?(
    error: Error,
    entityEnvelope: EntitySnapshotEnvelope,
    projectionMetadata: ProjectionMetadata<EntityInterface, ReadModelInterface>,
    entity: EntityInterface,
    readModel: ReadModelInterface | undefined
  ): Promise<Error | undefined>
  onSnapshotPersistError?(error: Error, snapshot: NonPersistedEntitySnapshotEnvelope): Promise<Error | undefined>
  onEventError?(error: Error, eventEnvelope: EventEnvelope): Promise<Error | undefined>
  onError?(error: Error | undefined): Promise<Error | undefined>
}

export interface GlobalErrorHandlerMetadata {
  readonly class: GlobalErrorHandlerInterface
}
