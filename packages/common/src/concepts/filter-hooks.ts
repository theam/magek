import { UserEnvelope, ReadModelRequestEnvelope } from '../envelope.js'
import { CommandInput } from './command.js'
import { QueryInput } from './query.js'
import { ReadModelInterface } from './read-model.js'

export interface CommandFilterHooks {
  readonly before?: Array<CommandBeforeFunction>
}

export type CommandBeforeFunction = (input: CommandInput, currentUser?: UserEnvelope) => Promise<CommandInput>

export interface ReadModelFilterHooks<TReadModel extends ReadModelInterface = ReadModelInterface> {
  readonly before?: Array<ReadModelBeforeFunction<TReadModel>>
}

export type ReadModelBeforeFunction<TReadModel extends ReadModelInterface = ReadModelInterface> = (
  readModelRequestEnvelope: ReadModelRequestEnvelope<TReadModel>,
  currentUser?: UserEnvelope
) => Promise<ReadModelRequestEnvelope<TReadModel>>

export interface QueryFilterHooks {
  readonly before?: Array<QueryBeforeFunction>
}

export type QueryBeforeFunction = (input: QueryInput, currentUser?: UserEnvelope) => Promise<QueryInput>
